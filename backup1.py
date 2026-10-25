import os
import sqlite3
from fastapi import FastAPI,Request,Response,HTTPException
from httpx import AsyncClient
from dotenv import load_dotenv
from google import genai
from google.genai import types
load_dotenv()

app=FastAPI()

META_TOKEN=os.getenv("META_ACCESS_TOKEN")
VERIFY_TOKEN=os.getenv("MY_WEBHOOK_VERIFY_TOKEN")
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")

ai_client=genai.Client(api_key=GEMINI_API_KEY)

user_sessions={}

def init_db():
    conn=sqlite3.connect("clinic.db")
    cursor=conn.cursor()
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT,
                   patient_name TEXT,
                   doctor_name TEXT,
                   appointment_date TEXT,
                   appointment_time TEXT
                   )
                   """)
    conn.commit()
    conn.close()

init_db()

def check_slot_availability(doctor_name : str,date: str,time: str) -> str:
    conn=sqlite3.connect("clinic.db")
    cursor=conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE doctor_name=? AND  appointment_date=? AND appointment_time=?",(doctor_name,date,time))
    result=cursor.fetchone()
    conn.close()

    if result:
        return "Booked"
    return "Available"

def book_appointment_db(patient_name: str, doctor_name: str, date: str,time:str) -> str:
    conn=sqlite3.connect("clinic.db")
    cursor=conn.cursor()
    cursor.execute(
        "INSERT INTO appointments (patient_name,doctor_name,appointment_date,appointment_time) VALUES (?,?,?,?)",
        (patient_name,doctor_name,date,time)
    )
    conn.commit()
    conn.close()
    return f"Success: booked for {patient_name} with {doctor_name} on {date} at {time}."

tools_map = {
    "check_slot_availability" : check_slot_availability,
    "book_appointment_db" : book_appointment_db
}

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
- Hamesha patient se unka Naam aur Pareshani (Symptoms) poocho.
- Agar patient kahe ki use fracture ya jodon ka dard hai, toh use Dr. Amit Sharma recommend karo. Agar fever/cold hai toh Dr. Neha Verma recommend karo.
- Jab patient date aur time bataye, toh sabse pehle `check_slot_availability` tool ka use karke database check karo.
- Agar slot 'Available' ho, tabhi `book_appointment_db` tool ka use karke appointment confirm karo aur patient ko batao.
- Agar slot 'Booked' ho, toh patient ko bolo ki wo samay busy hai aur koi dusra time suggest karo.
- Hamesha HINGLISH (Hindi written in English script) mein jawab do taaki Indian patients ko samajh aaye. Chote aur sweet replies do.
- agar conversation closing hai and supose you said ki aapko future me koi bhi sahayta ho you can contact and user ne bola ok ya aisa kuch closing statement then ruk jana hai 
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
- Hamesha patient se unka Naam aur Pareshani (Symptoms) poocho.
- Jab patient date aur time bataye, toh sabse pehle `check_slot_availability` tool ka use karke database check karo.
- Slot khali hone par hi `book_appointment_db` use karo.
"""


@app.get("/webhook")
async def verify_webhook(request:Request):
    params=request.query_params
    mode=params.get("hub_mode")
    token=params.get("hub.verify_token")
    challenge=params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == VERIFY_TOKEN:
            print("WEBHOOK VERIFIED SUCCESSFULLY!!!")
            return Response(content=challenge,media_type="text/plain")
        else:
            raise HTTPException(status_code=403,detail="verification token mismatch")
        return "webhook endpoint Active"


@app.post("/webhook")
async def handle_whatsapp_message(request:Request):
    body=await request.json()
    print("Received raw data from meta: ",body)
    try:
        if "messages" in body["entry"][0]["changes"][0]["value"]:
            msg_data = body["entry"][0]["changes"][0]["value"]["messages"][0]
            patient_phone=msg_data["from"]
            patient_text=msg_data["text"]["body"]

            print(f"message from {patient_phone}: {patient_text}")

            config=types.GenerateContentConfig(system_instruction=CLINIC_SYSTEM_PROMPT,
                                               tools = [check_slot_availability,book_appointment_db],temperature=0.3)
            
            if patient_phone not in user_sessions:
                print(f"Creating new AI chat session for {patient_phone}")
                user_sessions[patient_phone]=ai_client.chats.create(model='gemini-2.5-flash',config=config)
            # response=ai_client.models.generate_content(model='gemini-2.5-flash', contents=patient_text,config=config)

            chat_session=user_sessions[patient_phone]
            response= chat_session.send_message(patient_text)

            if response.function_calls:
                for call in response.function_calls:
                    func_name= call.name
                    func_args = call.args
                    print(f"AI wants to run function: {func_name} with args {func_args}")

                    tool_result = tools_map[func_name](**func_args)
                    # final_response = ai_client.models.generate_content(
                    #     model='gemini-2.5-flash',
                    #     contents=[patient_text,response.candidates[0].content,types.Part.from_function_response(name=func_name,response={"result":tool_result})],
                    #     config=config
                    # )
                    final_response = chat_session.send_message(name=func_name,response={"result":tool_result})
                    ai_reply=final_response.text
            else:
                ai_reply=response.text
            
            print(f"Bot Reply : {ai_reply}")
            await send_whatsapp_message(patient_phone,ai_reply)
    except Exception as e:
        print("Error processing webhook: ",str(e))

    return {"status":"success"}


async def send_whatsapp_message(to_phone : str,text : str):
    url = f"https://graph.facebook.com/v25.0/1118016721403625/messages"
    headers={
        "Authorization": f"Bearer {META_TOKEN}" ,
        'Content-Type': 'application/json'
    }
    payload={
        "messaging_product": "whatsapp", 
        "to": to_phone,
          "type": "text", 
          "text": { "body": text}
    }
    async with AsyncClient() as client:
        response=await client.post(url,json=payload,headers=headers)
        print("Meta Sent response: ",response.status_code,response.text)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app",host="0.0.0.0",port=3000,reload=True)