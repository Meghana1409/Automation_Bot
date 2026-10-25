import logging
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser
from app.models.service import Service
from app.models.staff import Staff
from app.models.discount import DiscountRule
from app.models.schedule import WorkingHours, Holiday, BookingCapacity
from app.models.appointment import Appointment
from app.core.security import hash_password

logger = logging.getLogger("salon_seed")

def seed_default_data(db: Session):
    """
    Seeds initial luxury salon data (30 exact salon services, stylists, luxury packages, appointments).
    Automatically refreshes if legacy clinical seed data is detected.
    """
    try:
        # Check if legacy data needs upgrade (e.g. if Exfoliation is missing)
        has_salon_services = db.query(Service).filter(Service.name == "Exfoliation").first() is not None
        if not has_salon_services:
            logger.info("Migrating legacy data to Luxury Salon & Spa data...")
            # Clean up old records to prevent foreign key issues
            db.query(Appointment).delete()
            db.query(DiscountRule).delete()
            # Clear staff_services relationship
            for st in db.query(Staff).all():
                st.services.clear()
            db.query(Staff).delete()
            db.query(Service).delete()
            db.commit()

        # 1. Seed or Update Admin User
        admin = db.query(AdminUser).first()
        if not admin:
            logger.info("Seeding default luxury salon admin user...")
            admin = AdminUser(
                username="admin",
                email="admin@salon.com",
                hashed_password=hash_password("Admin@123"),
                full_name="Luxe Salon Administrator",
                role="superadmin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Default salon admin created: admin@salon.com / Admin@123")
        else:
            # Keep both logins compatible
            if admin.email in ("admin@clinic.com", "admin"):
                admin.email = "admin@salon.com"
                admin.full_name = "Luxe Salon Administrator"
                db.commit()

        # 2. Seed the 30 Exact Salon Services
        if db.query(Service).count() == 0:
            logger.info("Seeding 30 Luxury Salon & Spa services...")
            salon_services = [
                Service(
                    name="Exfoliation",
                    category="Spa & Massages",
                    description="Invigorating full-body exfoliation using mineral-rich sea salts and organic botanical oils to restore a radiant glow.",
                    price=1200.0,
                    min_duration_minutes=30,
                    max_duration_minutes=45,
                    image_url="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/exfoliation",
                    is_active=True,
                ),
                Service(
                    name="Gel manicures",
                    category="Nails & Manicures",
                    description="Long-lasting chip-resistant gel polish cured under precision LED lights, including cuticle care and glossy seal.",
                    price=1100.0,
                    min_duration_minutes=45,
                    max_duration_minutes=60,
                    image_url="https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/gel-manicure",
                    is_active=True,
                ),
                Service(
                    name="Bridal services",
                    category="Bridal & Lashes",
                    description="Exclusive bespoke bridal makeover with HD airbrush makeup, couture hair artistry, floral styling, and veil draping.",
                    price=12500.0,
                    min_duration_minutes=180,
                    max_duration_minutes=240,
                    image_url="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/bridal",
                    is_active=True,
                ),
                Service(
                    name="Acrylic nails",
                    category="Nails & Manicures",
                    description="Full set sculpted acrylic nail enhancements with custom length, structural strength, and flawless contour shaping.",
                    price=1800.0,
                    min_duration_minutes=60,
                    max_duration_minutes=90,
                    image_url="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/acrylic-nails",
                    is_active=True,
                ),
                Service(
                    name="Eyelash extensions",
                    category="Bridal & Lashes",
                    description="Feather-light cashmere silk lash extensions applied individually for voluminous length and dramatic flutter.",
                    price=2400.0,
                    min_duration_minutes=60,
                    max_duration_minutes=90,
                    image_url="https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/eyelash-extensions",
                    is_active=True,
                ),
                Service(
                    name="Nail cut & filing",
                    category="Nails & Manicures",
                    description="Precision hygienic nail trimming, filing, contouring, and surface buffing for healthy natural nail beds.",
                    price=350.0,
                    min_duration_minutes=15,
                    max_duration_minutes=20,
                    image_url="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/nail-cut-file",
                    is_active=True,
                ),
                Service(
                    name="Nail painting",
                    category="Nails & Manicures",
                    description="Artful designer lacquer application with nourishing base coat, vibrant double layer, and fast-drying top shine.",
                    price=450.0,
                    min_duration_minutes=20,
                    max_duration_minutes=30,
                    image_url="https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/nail-painting",
                    is_active=True,
                ),
                Service(
                    name="Nail extensions",
                    category="Nails & Manicures",
                    description="Customized builder gel or tip extensions tailored to hand anatomy in almond, coffin, or square shapes.",
                    price=2200.0,
                    min_duration_minutes=60,
                    max_duration_minutes=75,
                    image_url="https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/nail-extensions",
                    is_active=True,
                ),
                Service(
                    name="Nail art",
                    category="Nails & Manicures",
                    description="Hand-painted creative accents, minimalist line art, floral botanicals, and gold foil stamping per accent nail.",
                    price=800.0,
                    min_duration_minutes=30,
                    max_duration_minutes=45,
                    image_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/nail-art",
                    is_active=True,
                ),
                Service(
                    name="Nail designs",
                    category="Nails & Manicures",
                    description="High-fashion multi-finger nail concepts featuring chrome glaze, ombré gradients, and Swarovski crystal clusters.",
                    price=1200.0,
                    min_duration_minutes=45,
                    max_duration_minutes=60,
                    image_url="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/nail-designs",
                    is_active=True,
                ),
                Service(
                    name="Polish removal",
                    category="Nails & Manicures",
                    description="Gentle acetone-free soak-off removing regular enamel, gel, or glitter polish without drying natural nails.",
                    price=250.0,
                    min_duration_minutes=15,
                    max_duration_minutes=20,
                    image_url="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/polish-removal",
                    is_active=True,
                ),
                Service(
                    name="Back massages",
                    category="Spa & Massages",
                    description="Stress-melting deep tissue and Swedish massage targeting back, spine, and shoulder muscle knots.",
                    price=1600.0,
                    min_duration_minutes=30,
                    max_duration_minutes=45,
                    image_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/back-massages",
                    is_active=True,
                ),
                Service(
                    name="Pedicure",
                    category="Nails & Manicures",
                    description="Relaxing warm foot bath, exfoliation, callous care, nail shaping, cuticle therapy, and foot massage.",
                    price=1000.0,
                    min_duration_minutes=45,
                    max_duration_minutes=60,
                    image_url="https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/pedicure",
                    is_active=True,
                ),
                Service(
                    name="Foot massages",
                    category="Spa & Massages",
                    description="Aromatherapy foot reflexology relieving fatigue, improving circulation, and calming tired soles.",
                    price=950.0,
                    min_duration_minutes=30,
                    max_duration_minutes=40,
                    image_url="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/foot-massages",
                    is_active=True,
                ),
                Service(
                    name="French manicures",
                    category="Nails & Manicures",
                    description="Timeless Parisian manicure with sheer natural pink base and pristine, hand-painted white crescent tips.",
                    price=1250.0,
                    min_duration_minutes=45,
                    max_duration_minutes=60,
                    image_url="https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/french-manicure",
                    is_active=True,
                ),
                Service(
                    name="Brazilian waxing",
                    category="Skincare & Waxing",
                    description="Premium stripless European hot wax ensuring intimate hair removal with maximum comfort and smooth results.",
                    price=1800.0,
                    min_duration_minutes=30,
                    max_duration_minutes=45,
                    image_url="https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/brazilian-waxing",
                    is_active=True,
                ),
                Service(
                    name="Manicure",
                    category="Nails & Manicures",
                    description="Classic hand ritual with rose petal warm water soak, gentle hand scrub, nail shaping, and hand massage.",
                    price=850.0,
                    min_duration_minutes=30,
                    max_duration_minutes=45,
                    image_url="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/classic-manicure",
                    is_active=True,
                ),
                Service(
                    name="Waxing",
                    category="Skincare & Waxing",
                    description="Smooth full arms and legs waxing using soothing chamomile and aloe vera organic resins.",
                    price=750.0,
                    min_duration_minutes=25,
                    max_duration_minutes=35,
                    image_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/waxing",
                    is_active=True,
                ),
                Service(
                    name="Spa services",
                    category="Spa & Massages",
                    description="Full holistic day spa experience including steam therapy, warm botanical body wrap, and head-to-toe massage.",
                    price=3500.0,
                    min_duration_minutes=90,
                    max_duration_minutes=120,
                    image_url="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/spa-services",
                    is_active=True,
                ),
                Service(
                    name="Hand & foot massages",
                    category="Spa & Massages",
                    description="Synchronized pressure therapy for hands, forearms, calves, and soles with warm lavender essential balm.",
                    price=1400.0,
                    min_duration_minutes=40,
                    max_duration_minutes=50,
                    image_url="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/hand-foot-massages",
                    is_active=True,
                ),
                Service(
                    name="Basic to advance facials",
                    category="Skincare & Facials",
                    description="Tailored aesthetic skin rejuvenation ranging from fruit enzyme detox to ultrasonic deep pore infusion and collagen masks.",
                    price=2800.0,
                    min_duration_minutes=60,
                    max_duration_minutes=75,
                    image_url="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/facials",
                    is_active=True,
                ),
                Service(
                    name="Hair colouring",
                    category="Hair Styling & Treatments",
                    description="Premium ammonia-free global hair color, balayage, or shadow-root melting with vibrant pigments and shine serum.",
                    price=3200.0,
                    min_duration_minutes=90,
                    max_duration_minutes=150,
                    image_url="https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/hair-colouring",
                    is_active=True,
                ),
                Service(
                    name="Hair smoothening",
                    category="Hair Styling & Treatments",
                    description="Thermal re-bonding and protein alignment leaving unruly, frizzy curls sleek, silky, and effortlessly manageable.",
                    price=4500.0,
                    min_duration_minutes=120,
                    max_duration_minutes=180,
                    image_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/hair-smoothening",
                    is_active=True,
                ),
                Service(
                    name="Botox",
                    category="Hair Styling & Treatments",
                    description="Deep reconstructive hair botox formula packed with amino acids and caviar oil filling gaps in damaged hair cuticles.",
                    price=4200.0,
                    min_duration_minutes=90,
                    max_duration_minutes=120,
                    image_url="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/hair-botox",
                    is_active=True,
                ),
                Service(
                    name="Fibre plux microfuel",
                    category="Hair Styling & Treatments",
                    description="Advanced molecular bond builder and microfuel treatment preventing breakage during styling and restoring elasticity.",
                    price=3800.0,
                    min_duration_minutes=60,
                    max_duration_minutes=90,
                    image_url="https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/fibre-plux",
                    is_active=True,
                ),
                Service(
                    name="Keratine",
                    category="Hair Styling & Treatments",
                    description="Hydrolyzed Brazilian keratin treatment eliminating 95% of frizz while locking in mirror gloss for up to 5 months.",
                    price=4800.0,
                    min_duration_minutes=120,
                    max_duration_minutes=180,
                    image_url="https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/keratine",
                    is_active=True,
                ),
                Service(
                    name="Hairfall treatment",
                    category="Hair Styling & Treatments",
                    description="Clinical-grade hair and scalp therapy with copper peptides, micro-needling infusion, and root-anchoring serum.",
                    price=2200.0,
                    min_duration_minutes=45,
                    max_duration_minutes=60,
                    image_url="https://images.unsplash.com/photo-1585751119414-ef2636f8aede?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/hairfall-treatment",
                    is_active=True,
                ),
                Service(
                    name="Hair thinning treatment",
                    category="Hair Styling & Treatments",
                    description="Scalp density reactivation protocol using bio-peptides and oxygen infusion to stimulate dormant hair follicles.",
                    price=2600.0,
                    min_duration_minutes=45,
                    max_duration_minutes=60,
                    image_url="https://images.unsplash.com/photo-1522337094846-8a818192de1f?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/hair-thinning",
                    is_active=True,
                ),
                Service(
                    name="Beauty Parlour",
                    category="Beauty & Grooming",
                    description="All-in-one express parlour service including brow threading, upper lip, herbal de-tan, and professional blow-dry.",
                    price=1500.0,
                    min_duration_minutes=45,
                    max_duration_minutes=60,
                    image_url="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/beauty-parlour",
                    is_active=True,
                ),
                Service(
                    name="Shampoo & conditioning",
                    category="Hair Styling & Treatments",
                    description="Invigorating hair and scalp cleanse with luxury argan oil bath followed by deep thermal moisture conditioning.",
                    price=600.0,
                    min_duration_minutes=20,
                    max_duration_minutes=30,
                    image_url="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80",
                    external_link="https://luxesalon.example.com/services/shampoo-conditioning",
                    is_active=True,
                ),
            ]
            db.add_all(salon_services)
            db.commit()
            logger.info("Successfully seeded all 30 salon services.")

        # 3. Seed Stylists & Beauticians
        if db.query(Staff).count() == 0:
            logger.info("Seeding luxury stylists and beauticians...")
            staff_data = [
                Staff(
                    name="Anya Roy",
                    title="Creative Hair Director & Colorist",
                    email="anya.roy@salon.com",
                    phone="+91 98765 43210",
                    bio="Renowned stylist with 10+ years expertise in Balayage, Keratin treatments, and precision couture haircuts.",
                    avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
                    is_active=True,
                ),
                Staff(
                    name="Priya Sen",
                    title="Master Nail Artist & Technician",
                    email="priya.sen@salon.com",
                    phone="+91 98765 43211",
                    bio="Certified international nail artist specializing in 3D gel designs, acrylic extensions, and luxury French manicures.",
                    avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80",
                    is_active=True,
                ),
                Staff(
                    name="Meera Kapoor",
                    title="Senior Aesthetician & Skincare Specialist",
                    email="meera.kapoor@salon.com",
                    phone="+91 98765 43212",
                    bio="Advanced skincare practitioner specializing in organic peel facials, Brazilian waxing, and bridal skin prep.",
                    avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80",
                    is_active=True,
                ),
                Staff(
                    name="Zoya Khan",
                    title="Holistic Spa & Body Therapist",
                    email="zoya.khan@salon.com",
                    phone="+91 98765 43213",
                    bio="Licensed massage therapist specialized in Swedish tension relief, hot stone rituals, and foot reflexology.",
                    avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
                    is_active=True,
                ),
                Staff(
                    name="Rhea Malhotra",
                    title="Senior Bridal Makeup & Hair Artist",
                    email="rhea.malhotra@salon.com",
                    phone="+91 98765 43214",
                    bio="Award-winning destination bridal makeup artist creating flawless radiant looks and voluminous lash styling.",
                    avatar_url="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80",
                    is_active=True,
                ),
            ]
            db.add_all(staff_data)
            db.commit()

            # Map stylists to services
            all_services = db.query(Service).all()
            srv_by_name = {s.name: s for s in all_services}
            anya = db.query(Staff).filter(Staff.name == "Anya Roy").first()
            priya = db.query(Staff).filter(Staff.name == "Priya Sen").first()
            meera = db.query(Staff).filter(Staff.name == "Meera Kapoor").first()
            zoya = db.query(Staff).filter(Staff.name == "Zoya Khan").first()
            rhea = db.query(Staff).filter(Staff.name == "Rhea Malhotra").first()

            if anya:
                for s_name in ["Hair colouring", "Hair smoothening", "Botox", "Keratine", "Shampoo & conditioning", "Fibre plux microfuel", "Hairfall treatment", "Hair thinning treatment"]:
                    if s_name in srv_by_name:
                        anya.services.append(srv_by_name[s_name])

            if priya:
                for s_name in ["Gel manicures", "Acrylic nails", "Nail cut & filing", "Nail painting", "Nail extensions", "Nail art", "Nail designs", "Polish removal", "French manicures", "Manicure", "Pedicure"]:
                    if s_name in srv_by_name:
                        priya.services.append(srv_by_name[s_name])

            if meera:
                for s_name in ["Basic to advance facials", "Waxing", "Brazilian waxing", "Beauty Parlour", "Exfoliation"]:
                    if s_name in srv_by_name:
                        meera.services.append(srv_by_name[s_name])

            if zoya:
                for s_name in ["Back massages", "Foot massages", "Spa services", "Hand & foot massages", "Exfoliation"]:
                    if s_name in srv_by_name:
                        zoya.services.append(srv_by_name[s_name])

            if rhea:
                for s_name in ["Bridal services", "Eyelash extensions", "Beauty Parlour", "French manicures"]:
                    if s_name in srv_by_name:
                        rhea.services.append(srv_by_name[s_name])

            db.commit()

        # 4. Seed Working Hours (7 Days, Luxury Salon Hours)
        if db.query(WorkingHours).count() == 0:
            logger.info("Seeding salon working hours (Monday through Sunday)...")
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            working_hours = []
            for idx, name in enumerate(day_names):
                working_hours.append(
                    WorkingHours(
                        day_of_week=idx,
                        day_name=name,
                        is_open=True,
                        open_time="09:00",
                        close_time="20:00",
                        break_start="13:00",
                        break_end="14:00",
                    )
                )
            db.add_all(working_hours)
            db.commit()

        # 5. Seed Salon Holidays
        if db.query(Holiday).count() == 0:
            logger.info("Seeding salon holidays...")
            holidays = [
                Holiday(holiday_date="2026-11-01", name="Diwali Glamour Holiday"),
                Holiday(holiday_date="2026-12-25", name="Christmas Celebration"),
                Holiday(holiday_date="2027-01-01", name="New Year Day"),
            ]
            db.add_all(holidays)
            db.commit()

        # 6. Seed Salon Station Booking Capacity Limit
        if db.query(BookingCapacity).count() == 0:
            logger.info("Seeding salon chair capacity setting...")
            capacity = BookingCapacity(
                max_bookings_per_hour=6,
                slot_duration_minutes=60,
                allow_overbooking=False,
                notes="Maximum 6 client appointments allowed per hour across styling chairs and private beauty suites.",
            )
            db.add(capacity)
            db.commit()

        # 7. Seed Salon Discount Rules & Beauty Packages
        if db.query(DiscountRule).count() == 0:
            logger.info("Seeding luxury salon discount packages...")
            mani_srv = db.query(Service).filter(Service.name == "Manicure").first()
            pedi_srv = db.query(Service).filter(Service.name == "Pedicure").first()
            mani_pedi_ids = f"{mani_srv.id},{pedi_srv.id}" if mani_srv and pedi_srv else "17,13"

            keratin_srv = db.query(Service).filter(Service.name == "Keratine").first()
            spa_srv = db.query(Service).filter(Service.name == "Spa services").first()
            keratin_spa_ids = f"{keratin_srv.id},{spa_srv.id}" if keratin_srv and spa_srv else "26,19"

            rules = [
                DiscountRule(
                    code="LUXE-FIRST20",
                    title="New Client First-Visit Pamper Offer",
                    description="Flat 20% discount applied automatically on your first visit to Luxe Salon & Spa.",
                    rule_type="first_order",
                    discount_type="percentage",
                    discount_value=20.0,
                    min_cart_value=800.0,
                    is_active=True,
                ),
                DiscountRule(
                    code="GLOW-FESTIVE",
                    title="Festive Glamour Celebration Offer",
                    description="Flat ₹500 off on any luxury salon and spa services booking above ₹2000.",
                    rule_type="festival",
                    discount_type="fixed",
                    discount_value=500.0,
                    min_cart_value=2000.0,
                    start_date="2026-10-01",
                    end_date="2026-12-31",
                    is_active=True,
                ),
                DiscountRule(
                    code="MANI-PEDI-COMBO",
                    title="Royal Manicure & Pedicure Duo",
                    description="Save 20% when you book both a luxury Manicure and Pedicure session together.",
                    rule_type="service_bundle",
                    discount_type="percentage",
                    discount_value=20.0,
                    bundle_required_service_ids=mani_pedi_ids,
                    min_cart_value=1500.0,
                    is_active=True,
                ),
                DiscountRule(
                    code="KERATIN-SPA",
                    title="Silk Keratin & Deep Spa Package",
                    description="Save 25% on our transformative Keratine treatment alongside full Spa services.",
                    rule_type="service_bundle",
                    discount_type="percentage",
                    discount_value=25.0,
                    bundle_required_service_ids=keratin_spa_ids,
                    min_cart_value=4000.0,
                    is_active=True,
                ),
            ]
            db.add_all(rules)
            db.commit()

        # 8. Seed Initial Client Appointments
        if db.query(Appointment).count() == 0:
            logger.info("Seeding initial salon client appointments...")
            today_str = date.today().strftime("%Y-%m-%d")
            tomorrow_str = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

            mani_srv = db.query(Service).filter(Service.name == "Gel manicures").first()
            keratin_srv = db.query(Service).filter(Service.name == "Keratine").first()
            facial_srv = db.query(Service).filter(Service.name == "Basic to advance facials").first()
            bridal_srv = db.query(Service).filter(Service.name == "Bridal services").first()

            anya = db.query(Staff).filter(Staff.name == "Anya Roy").first()
            priya = db.query(Staff).filter(Staff.name == "Priya Sen").first()
            meera = db.query(Staff).filter(Staff.name == "Meera Kapoor").first()
            rhea = db.query(Staff).filter(Staff.name == "Rhea Malhotra").first()

            sample_apps = [
                Appointment(
                    patient_name="Tara Singhania",
                    patient_phone="+91 99887 76611",
                    patient_email="tara.s@example.com",
                    doctor_name=priya.name if priya else "Priya Sen",
                    staff_id=priya.id if priya else None,
                    service_id=mani_srv.id if mani_srv else None,
                    appointment_date=today_str,
                    appointment_time="10:00 AM",
                    status="approved",
                    notes="Prefers almond shaped nails with glossy pastel finish",
                ),
                Appointment(
                    patient_name="Ananya Sharma",
                    patient_phone="+91 99887 76622",
                    patient_email="ananya.sharma@example.com",
                    doctor_name=anya.name if anya else "Anya Roy",
                    staff_id=anya.id if anya else None,
                    service_id=keratin_srv.id if keratin_srv else None,
                    appointment_date=today_str,
                    appointment_time="11:30 AM",
                    status="approved",
                    notes="Hair consultation for post-monsoon frizz reduction",
                ),
                Appointment(
                    patient_name="Kareena Mehta",
                    patient_phone="+91 99887 76633",
                    patient_email="kareena.m@example.com",
                    doctor_name=meera.name if meera else "Meera Kapoor",
                    staff_id=meera.id if meera else None,
                    service_id=facial_srv.id if facial_srv else None,
                    appointment_date=today_str,
                    appointment_time="05:00 PM",
                    status="pending",
                    notes="Client requested organic hydrating gold facial",
                ),
                Appointment(
                    patient_name="Simran Kaur",
                    patient_phone="+91 99887 76644",
                    patient_email="simran.k@example.com",
                    doctor_name=rhea.name if rhea else "Rhea Malhotra",
                    staff_id=rhea.id if rhea else None,
                    service_id=bridal_srv.id if bridal_srv else None,
                    appointment_date=tomorrow_str,
                    appointment_time="10:00 AM",
                    status="approved",
                    notes="Pre-wedding bridal trial consultation and look testing",
                ),
            ]
            db.add_all(sample_apps)
            db.commit()

        logger.info("Luxury Salon & Spa seed initialization completed successfully.")

    except Exception as e:
        logger.error(f"Error seeding default salon data: {e}", exc_info=True)
        db.rollback()
