import os
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI,Request,Response,HTTPException
from httpx import AsyncClient
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate,MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories.in_memory import ChatMessageHistory
from langchain_core.messages import ToolMessage

load_dotenv()

app=FastAPI()

META_TOKEN=os.getenv("META_ACCESS_TOKEN")
VERIFY_TOKEN=os.getenv("MY_WEBHOOK_VERIFY_TOKEN")
GROQ_API_KEY=os.getenv("GROQ_API_KEY")
DATABASE_URL=os.getenv("DATABASE_URL")

# ai_client=genai.Client(api_key=GEMINI_API_KEY)

user_sessions={}

def get_session_history(session_id : str):
    if session_id not in user_sessions:
        user_sessions[session_id]=ChatMessageHistory()
    return user_sessions[session_id]

def init_db():
    conn=psycopg2.connect(DATABASE_URL)
    cursor=conn.cursor()
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY ,
                   patient_name TEXT,
                   doctor_name TEXT,
                   appointment_date TEXT,
                   appointment_time TEXT
                   )
                   """)
    conn.commit()
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS processed_messages (id SERIAL PRIMARY KEY ,
                   processed_At Timestamp default current_timestamp
                   )
                   """)
    conn.commit()
    conn.close()

init_db()

@tool
def check_slot_availability(doctor_name : str,date: str,time: str) -> str:
    """ checks slots availability for patients"""
    conn=psycopg2.connect(DATABASE_URL)
    cursor=conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE doctor_name=%s AND appointment_date=%s AND appointment_time=%s",(doctor_name, date, time))
    result=cursor.fetchone()
    conn.close()

    if result:
        return "Booked"
    return "Available"

@tool
def book_appointment_db(patient_name: str, doctor_name: str, date: str,time:str) -> str:
    """books an appointment for patients at available time"""
    conn=psycopg2.connect(DATABASE_URL)
    cursor=conn.cursor()
    cursor.execute(
        "INSERT INTO appointments (patient_name, doctor_name, appointment_date, appointment_time) VALUES (%s, %s, %s, %s)",(patient_name, doctor_name, date, time)
    )
    conn.commit()
    conn.close()
    return f"Success: booked for {patient_name} with {doctor_name} on {date} at {time}."

tools = [check_slot_availability,book_appointment_db]

llm= ChatGroq(groq_api_key=GROQ_API_KEY,model="openai/gpt-oss-120b",temperature=0.3)
ll_with_tools=llm.bind_tools(tools)   

CLINIC_SYSTEM_PROMPT = """ 

"""

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

RULES FOR CONVERSATION:

"""



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

⚠️ LANGUAGE RULES (SABSE ZAROORI):
- User jis bhasha (Language ya Script) mein message bhej raha hai, tumhein USI bhasha mein jawab dena hai!
- Agar user English mein likhe, toh pure English mein jawab do.
- Agar user Marathi mein likhe (e.g., 'Mala appointment pahije'), toh Marathi mein hi reply karo (e.g., 'Sure, tumhaala konasathi appointment pahije?').
- Agar user Hinglish ya Hindi mein likhe, toh Hinglish/Hindi mein jawab do.
- Kisi bhi halat mein apni politeness aur clinic ke rules mat bhoolna.

RULES FOR CONVERSATION:
- aaj word use kiya patient ne to iska mtlb cuurent date ,kal means tommorrow ka date 
- - Hamesha patient se unka Naam aur Pareshani (Symptoms) poocho.
- Agar patient kahe ki use fracture ya jodon ka dard hai, toh use Dr. Amit Sharma recommend karo. Agar fever/cold hai toh Dr. Neha Verma recommend karo.
- Jab patient date aur time bataye, toh sabse pehle `check_slot_availability` tool ka use karke database check karo.
- Agar slot 'Available' ho, tabhi `book_appointment_db` tool ka use karke appointment confirm karo aur patient ko batao.
- Agar slot 'Booked' ho, toh patient ko bolo ki wo samay busy hai aur koi dusra time suggest karo.
- Hamesha HINGLISH (Hindi written in English script) mein jawab do taaki Indian patients ko samajh aaye. Chote aur sweet replies do.
- agar conversation closing hai and supose you said ki aapko future me koi bhi sahayta ho you can contact and user ne bola ok ya aisa kuch closing statement then ruk jana hai 
"""

prompt=ChatPromptTemplate.from_messages([
    ("system",CLINIC_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="history"),
    ("human","{input}")
])

chain=prompt|ll_with_tools

runnable_with_history=RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history"
)

async def send_whatsapp_message(to_phone : str,text_body : str):
    url = f"https://graph.facebook.com/v25.0/1118016721403625/messages"
    headers={
        "Authorization": f"Bearer {META_TOKEN}" ,
        'Content-Type': 'application/json'
    }
    payload={
        "messaging_product": "whatsapp", 
        "to": to_phone,
          "type": "text", 
          "text": { "body": text_body}
    }
    async with AsyncClient() as client:
        await client.post(url,json=payload,headers=headers)
        # print("Meta Sent response: ",response.status_code,response.text)


@app.get("/webhook")
async def verify_webhook(request:Request):
    params=request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == VERIFY_TOKEN:
        return Response(content=params.get("hub.challenge"),media_type="text/plain")
    
    raise HTTPException(status_code=403,detail="verification token mismatch")


@app.post("/webhook")
async def handle_whatsapp_message(request:Request):
    body=await request.json()
    print("Received raw data from meta: ",body)
    if "statuses" in body.get("entry",[{}])[0].get("chances",[{}])[0].get("value",{}):
        return {"status":"ignored_status_update"}
    try:
        message_value=body["entry"][0]["changes"][0]["value"]
        if "messages" in message_value:
            msg_id=message_value["messages"][0]["id"]
            msg_data = message_value["messages"][0]
            patient_phone=msg_data["from"]
            patient_text=msg_data["text"]["body"]
            print(f"message from {patient_phone}: {patient_text}")
            print("db")
            conn=psycopg2.connect(DATABASE_URL)
            print("db")
            cursor=conn.cursor()
            print("db")
            cursor.execute("SELECT id FROM processed_messages WHERE id=%s ",(id,))
            print("db")
            already_processed=cursor.fetchone()
            if already_processed:
                conn.close()
                print(f"Duplicate message detected ({msg_id}),ignoring !")
                return {"status":"duplicate_ignored"}
            cursor.execute("INSERT INTO processed_messages (id) VALUES (%s)",(msg_id,))
            conn.commit()
            conn.close()
            
            config={"callable_config":{},"configurable":{"session_id":patient_phone}}
            response=runnable_with_history.invoke({"input": patient_text},config=config)
            ai_reply=''
            if response.tool_calls:
                for call in response.tool_calls:
                    if call['name'] == "check_slot_availability":
                        result=check_slot_availability.invoke(call['args'])
                    elif call['name'] == "book_appointment_db":
                        result=book_appointment_db.invoke(call['args'])
                    history=get_session_history(patient_phone)
                    history.add_ai_message(response)
                    # gadbad
                    tool_message = ToolMessage(content=str(result), tool_call_id=call['id'],name=call['name'])
                    history.add_message(tool_message)
                    # history.add_message(type="tool",content=result,tool_call_id=call['id'])
                    final_response = chain.invoke({"input":patient_text,"history":history.messages})
                    ai_reply=final_response.content
            else:
                ai_reply=response.content
            print(f"Bot Reply : {ai_reply}")
            await send_whatsapp_message(patient_phone,ai_reply)
    except Exception as e:
        print("Error processing webhook: ",str(e))

    return {"status":"success"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app",host="0.0.0.0",port=3000,reload=True)
