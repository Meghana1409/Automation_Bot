import logging
from typing import Dict
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories.in_memory import ChatMessageHistory
from langchain_core.messages import ToolMessage

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.appointment_service import check_slot_availability as db_check_slot
from app.services.appointment_service import book_appointment as db_book_appointment
from app.schemas.appointment import AppointmentCreate

logger = logging.getLogger(__name__)

user_sessions: Dict[str, ChatMessageHistory] = {}

def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in user_sessions:
        user_sessions[session_id] = ChatMessageHistory()
    return user_sessions[session_id]

@tool
def check_slot_availability(doctor_name: str, date: str, time: str) -> str:
    """Checks slot availability for patients with a specific doctor, date, and time."""
    db = SessionLocal()
    try:
        is_available = db_check_slot(db, doctor_name=doctor_name, date=date, time=time)
        return "Available" if is_available else "Booked"
    finally:
        db.close()

@tool
def book_appointment_db(patient_name: str, doctor_name: str, date: str, time: str) -> str:
    """Books an appointment for a patient at an available date and time."""
    db = SessionLocal()
    try:
        # Check first
        if not db_check_slot(db, doctor_name=doctor_name, date=date, time=time):
            return f"Failed: Slot with {doctor_name} on {date} at {time} is already booked."
            
        appointment_in = AppointmentCreate(
            patient_name=patient_name,
            doctor_name=doctor_name,
            appointment_date=date,
            appointment_time=time,
            patient_phone="",
            status="confirmed"
        )
        db_book_appointment(db, appointment_in)
        return f"Success: booked for {patient_name} with {doctor_name} on {date} at {time}."
    finally:
        db.close()

tools = [check_slot_availability, book_appointment_db]

CLINIC_SYSTEM_PROMPT = """
Tum 'Care & Cure Clinic' ke ek bohot hi polite, professional aur helpful AI Medical Receptionist ho. 
Tumhara kaam patients se baat karna, unki pareshani samajhna aur unka appointment book karna hai.

Kripya niche di gayi Clinic ki details ko dhyan se padho aur isi ke hisab se jawab do:
1. CLINIC TIMINGS: Monday to Saturday, Subah 9:00 AM se Raat 9:00 PM tak. Sunday clinic band rehta hai.
2. SPECIALITIES & DISEASES WE TREAT:
   - Orthopedics (Haddiyon aur Jodon ka dard, Fracture, Back pain)
   - General Medicine (Fever, Cough, Cold, Diabetes, Stomach ache, Blood Pressure)
3. OUR DOCTORS:
   - Dr. Amit Sharma (Orthopedic Surgeon) -> Timings: 10:00 AM se 2:00 PM
   - Dr. Neha Verma (General Physician) -> Timings: 5:00 PM se 9:00 PM

LANGUAGE RULES:
- User jis bhasha (Language ya Script) mein message bhej raha hai, tumhein USI bhasha mein jawab dena hai!
- Agar user English mein likhe, toh pure English mein jawab do.
- Agar user Marathi mein likhe (e.g., 'Mala appointment pahije'), toh Marathi mein hi reply karo.
- Agar user Hinglish ya Hindi mein likhe, toh Hinglish/Hindi mein jawab do.
- Kisi bhi halat mein apni politeness aur clinic ke rules mat bhoolna.

RULES FOR CONVERSATION:
- 'aaj' word use kiya patient ne to iska matlab current date, 'kal' means tomorrow ka date.
- Hamesha patient se unka Naam aur Pareshani (Symptoms) poocho.
- Agar patient kahe ki use fracture ya jodon ka dard hai, toh Dr. Amit Sharma recommend karo. Agar fever/cold hai toh Dr. Neha Verma recommend karo.
- Jab patient date aur time bataye, toh sabse pehle `check_slot_availability` tool ka use karke database check karo.
- Agar slot 'Available' ho, tabhi `book_appointment_db` tool ka use karke appointment confirm karo aur patient ko batao.
- Agar slot 'Booked' ho, toh patient ko bolo ki wo samay busy hai aur koi dusra time suggest karo.
- Hamesha friendly, sweet aur concise replies do.
- Agar conversation closing hai (e.g., 'Thank you', 'ok bye'), polite closing reply dekar ruk jana.
"""

def get_agent_chain():
    if not settings.GROQ_API_KEY:
        return None
    llm = ChatGroq(
        groq_api_key=settings.GROQ_API_KEY,
        model="openai/gpt-oss-120b",
        temperature=0.3
    )
    llm_with_tools = llm.bind_tools(tools)
    prompt = ChatPromptTemplate.from_messages([
        ("system", CLINIC_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}")
    ])
    chain = prompt | llm_with_tools
    runnable_with_history = RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="history"
    )
    return runnable_with_history, chain

def process_patient_message(patient_phone: str, patient_text: str) -> str:
    """
    Executes the conversational receptionist agent with tool execution loop.
    """
    if not settings.GROQ_API_KEY:
        return "Namaste! Clinic system is online. Please set GROQ_API_KEY in your .env to enable the AI receptionist responses."

    agent_setup = get_agent_chain()
    if not agent_setup:
        return "Service unavailable: AI agent could not be initialized."

    runnable_with_history, chain = agent_setup
    config = {"callable_config": {}, "configurable": {"session_id": patient_phone}}

    response = runnable_with_history.invoke({"input": patient_text}, config=config)
    ai_reply = ""

    if response.tool_calls:
        history = get_session_history(patient_phone)
        history.add_ai_message(response)
        for call in response.tool_calls:
            result = ""
            if call["name"] == "check_slot_availability":
                result = check_slot_availability.invoke(call["args"])
            elif call["name"] == "book_appointment_db":
                result = book_appointment_db.invoke(call["args"])

            tool_message = ToolMessage(
                content=str(result),
                tool_call_id=call["id"],
                name=call["name"]
            )
            history.add_message(tool_message)

        final_response = chain.invoke({
            "input": patient_text,
            "history": history.messages
        })
        ai_reply = final_response.content
    else:
        ai_reply = response.content

    return ai_reply
