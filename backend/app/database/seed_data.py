import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..auth.security import get_password_hash
from ..models.models import (
    User, Room, RoomBed, VisitSlot, Facility, PGInformation, GalleryItem,
    VisitRequest, Booking, Notification, ContactMessage, Resident, BedAllocation, ResidentHistory
)
from ..utils.room_occupancy import sync_room_occupancy

def seed_database(db: Session):

    # 1. Seed Admin
    admin_user = db.query(User).filter(User.email == "admin@srilakshmipg.com").first()
    if not admin_user:
        admin_user = User(
            full_name="Sri Lakshmi PG Management",
            email="admin@srilakshmipg.com",
            phone="+91 78937 44206",
            hashed_password=get_password_hash("Admin@PG2026!"),
            role="ADMIN",
            occupation="PG Owner & Estate Manager",
            company_or_college="Sri Lakshmi Srinivasa Group",
            emergency_contact="+91 90032 80430",
            address="3, Bhavani St, Bharathi Nagar, Velachery, Chennai - 600113",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # 2. Seed Demo Resident User
    demo_user = db.query(User).filter(User.email == "karthik.r@example.com").first()
    if not demo_user:
        demo_user = User(
            full_name="Karthik Ramanathan",
            email="karthik.r@example.com",
            phone="+91 98765 43210",
            hashed_password=get_password_hash("User@PG2026!"),
            role="USER",
            occupation="Software Engineer",
            company_or_college="Ascendas Tech Park, Taramani",
            emergency_contact="+91 98401 23456",
            address="Native: Trichy, Tamil Nadu",
            is_active=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    # 3. Seed PG Information
    pg_info = db.query(PGInformation).filter(PGInformation.id == 1).first()
    if not pg_info:
        faq_list = [
            {"q": "How can I visit the PG in Velachery?", "a": "You can easily schedule a physical visit by clicking 'Schedule a Visit' on this website. Choose your preferred date and time slot. Our PG manager will confirm the slot, and you'll receive a confirmation with directions."},
            {"q": "What is the location of the PG?", "a": "We are located at 3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu 600113 — within 5-10 minutes from Velachery MRTS station, Taramani IT hub, and 100 Feet Road."},
            {"q": "Are both AC and Non-AC rooms available?", "a": "Yes! We offer single, double, triple, and four-sharing options in both AC and well-ventilated Non-AC categories to suit different budgets."},
            {"q": "Do I need to create an account to view rooms?", "a": "No, you can browse all photos, room types, facilities, and contact details without logging in. Registration is only needed when booking a room or scheduling an official visit."},
            {"q": "What are the check-in and gate hours?", "a": "The PG is open 24 hours daily with round-the-clock security and gated access. Residents have convenient round-the-clock access with their biometric/register ID."},
            {"q": "What amenities are included with the room?", "a": "High-speed Wi-Fi, fully automatic washing machines, 24/7 drinking water via commercial RO plant, power backup, hot water geysers, individual steel lockers, and housekeeping are included."},
            {"q": "How does room booking approval work?", "a": "When you submit a room booking request, our manager verifies real-time bed availability in that specific room, reviews your profile, and approves the allocation."}
        ]
        pg_info = PGInformation(
            id=1,
            name="Sri Lakshmi Srinivasa Gents PG",
            tagline="Comfortable PG Living in Velachery, Chennai",
            address="3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu 600113",
            phone="+91 78937 44206",
            alt_phone="+91 90032 80430",
            email="srilakshmisrinivasa.pg@gmail.com",
            opening_hours="Open 24 Hours Daily",
            google_rating="3.6 / 5 (14 Reviews)",
            about_text="Sri Lakshmi Srinivasa Gents PG is a well-established men's PG accommodation located at Bhavani Street, Bharathi Nagar in Velachery, Chennai. Conveniently close to Taramani IT corridor, Velachery Railway Station, and Ascendas, we provide clean, secure, and comfortable accommodation for working professionals and students.",
            rules_text="1. Respect fellow roommates and maintain peaceful decorum.\n2. Entrance gate operates 24/7 with security register entry.\n3. Keep personal cots and lockers organized.\n4. Strictly no smoking or alcohol consumption on property premises.\n5. Visitors permitted in common lounge from 9:00 AM to 8:00 PM.",
            faq_data=json.dumps(faq_list),
            social_links=json.dumps({
                "whatsapp": "https://wa.me/917893744206",
                "maps": "https://maps.google.com/?q=Sri+Lakshmi+Srinivasa+Gents+PG+Velachery+Chennai",
                "phone": "tel:+917893744206"
            })
        )
        db.add(pg_info)
        db.commit()

    # 4. Seed Visit Slots
    slots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"]
    for s in slots:
        existing_slot = db.query(VisitSlot).filter(VisitSlot.time_label == s).first()
        if not existing_slot:
            db.add(VisitSlot(time_label=s, is_enabled=True, max_capacity=3))
    db.commit()

    # 5. Seed Facilities
    if db.query(Facility).count() == 0:
        facilities_data = [
            ("Free High-Speed Wi-Fi", "essential", "High-speed optic fiber Wi-Fi access on every floor for work from home and streaming.", "wifi", 1),
            ("24/7 Security & CCTV", "security", "Around-the-clock physical security watch with CCTV coverage in common corridors and gates.", "shield-check", 2),
            ("Washing Machine Facility", "convenience", "Fully automatic washing machines located in a dedicated covered laundry terrace area.", "droplet", 3),
            ("AC & Non-AC Rooms", "comfort", "Choice of energy-efficient split air conditioning or well-ventilated cross-breeze rooms.", "wind", 4),
            ("Purified RO Drinking Water", "essential", "Commercial stainless steel RO water purifier and chiller providing clean drinking water 24/7.", "cup-straw", 5),
            ("Power Backup", "essential", "Inverter backup system ensuring uninterrupted lighting, fans, and internet connectivity.", "lightning-charge", 6),
            ("Daily Housekeeping", "convenience", "Regular cleaning of common areas, bathrooms, and corridors for hygienic living.", "stars", 7),
            ("Two-Wheeler Parking", "convenience", "Safe gated parking inside the building compound for bikes and scooters.", "bicycle", 8),
            ("Individual Steel Lockers", "security", "Every resident receives an individual steel wardrobe/almirah with personal key lock.", "lock", 9),
            ("Hot Water Geysers", "comfort", "Electric water heaters installed in bathrooms for instant hot showers.", "thermometer-sun", 10),
            ("Open 24 Hours Access", "convenience", "Flexible access suitable for working professionals with rotational or night shifts.", "clock", 11),
            ("Spacious Dining Area", "comfort", "Clean and orderly communal dining space with tables and chairs.", "building", 12)
        ]
        for title, cat, desc, icon, order in facilities_data:
            db.add(Facility(title=title, category=cat, description=desc, icon=icon, is_active=True, display_order=order))
        db.commit()

    # 6. Seed Gallery (Authentic Photos + Supporting Renders)
    if db.query(GalleryItem).count() == 0:
        gallery_data = [
            ("Real Building Exterior", "Exterior", "/images/exterior_main.png", "Real exterior of Sri Lakshmi Srinivasa Gents PG at Bhavani St, Velachery", True, True, 1),
            ("Official PG Signboard", "Signboard", "/images/signboard.png", "Official signboard displaying phone numbers: 78937 44206 / 90032 80430", True, True, 2),
            ("Authentic Double Bed Room", "Bedrooms", "/images/bedroom_double.png", "Real room photo showing twin beds with signature red mattresses", True, True, 3),
            ("Triple Sharing Room Interior", "Bedrooms", "/images/bedroom_triple_wallpaper.png", "Real bedroom showing 3 cots and wallpaper decor in Velachery PG", True, True, 4),
            ("Cots & Headboard Setup", "Bedrooms", "/images/bedroom_triple_cot.png", "Actual wooden cot setup with headboards and red bedsheets", False, True, 5),
            ("Room Interior with Wardrobe", "Bedrooms", "/images/room_wardrobe.png", "Actual room view featuring personal steel storage wardrobe", False, True, 6),
            ("Building Modern Facade", "Exterior", "/images/building_facade.png", "Real view of balconies, glass railings, and modern exterior finish", False, True, 7),
            ("Outdoor Surroundings", "Surroundings", "/images/outdoor_garden.png", "Outdoor green foliage and quiet residential street in Bhavani St", False, True, 8),
            ("High-Res Property Facade", "Exterior", "/images/pg_exterior_main.jpg", "Architectural street perspective of Sri Lakshmi Srinivasa Gents PG", True, False, 9),
            ("Double Sharing AC Room", "Bedrooms", "/images/pg_room_double.jpg", "Spacious 2-sharing bedroom with matching red beds and natural light", True, False, 10),
            ("Triple Sharing Executive Room", "Bedrooms", "/images/pg_room_triple.jpg", "Clean 3-sharing accommodation with individual wardrobes and ceiling fan", False, False, 11),
            ("Terrace Laundry Utility", "Facilities", "/images/pg_washing_amenity.jpg", "Covered terrace laundry zone with automatic washing machines", True, False, 12),
            ("Common Dining & RO Water", "Facilities", "/images/pg_dining_water.jpg", "Clean dining tables and commercial RO drinking water dispenser", True, False, 13)
        ]
        for title, cat, url, cap, feat, auth, order in gallery_data:
            db.add(GalleryItem(
                title=title, category=cat, image_url=url, caption=cap,
                is_featured=feat, is_authentic=auth, display_order=order
            ))
        db.commit()

    # 7. Seed Rooms
    if db.query(Room).count() == 0:
        rooms_list = [
            {
                "room_number": "101",
                "room_type": "DOUBLE",
                "is_ac": False,
                "floor": 1,
                "capacity": 2,
                "available_beds": 1,
                "monthly_rent": 6500.0,
                "security_deposit": 5000.0,
                "description": "Well-ventilated double sharing room on the first floor with twin cots, red mattresses, individual lockers, and ceiling fan.",
                "amenities": "Free Wi-Fi, Ceiling Fan, Individual Cupboard, Hot Water, Daily Housekeeping",
                "images": json.dumps(["/images/bedroom_double.png", "/images/pg_room_double.jpg"]),
                "status": "PARTIALLY_AVAILABLE",
                "beds": [("B1", True, "Existing Resident"), ("B2", False, None)]
            },
            {
                "room_number": "102",
                "room_type": "DOUBLE",
                "is_ac": True,
                "floor": 1,
                "capacity": 2,
                "available_beds": 2,
                "monthly_rent": 8500.0,
                "security_deposit": 6000.0,
                "description": "Cool air-conditioned double sharing room with split AC, attached washroom, comfortable red mattress cots, and study table.",
                "amenities": "Split AC, Free Wi-Fi, Attached Bathroom, Individual Cupboard, Hot Water",
                "images": json.dumps(["/images/pg_room_double.jpg", "/images/bedroom_double.png"]),
                "status": "AVAILABLE",
                "beds": [("B1", False, None), ("B2", False, None)]
            },
            {
                "room_number": "201",
                "room_type": "TRIPLE",
                "is_ac": False,
                "floor": 2,
                "capacity": 3,
                "available_beds": 2,
                "monthly_rent": 5500.0,
                "security_deposit": 4000.0,
                "description": "Economical 3-sharing room on second floor with balcony cross-ventilation, feature wall finish, and individual storage wardrobes.",
                "amenities": "Free Wi-Fi, Individual Steel Cupboard, Ceiling Fans, Balcony Access, Hot Water",
                "images": json.dumps(["/images/bedroom_triple_wallpaper.png", "/images/pg_room_triple.jpg"]),
                "status": "AVAILABLE",
                "beds": [("B1", True, "Rahul V"), ("B2", False, None), ("B3", False, None)]
            },
            {
                "room_number": "202",
                "room_type": "TRIPLE",
                "is_ac": True,
                "floor": 2,
                "capacity": 3,
                "available_beds": 3,
                "monthly_rent": 7500.0,
                "security_deposit": 5000.0,
                "description": "Premium 3-sharing AC room with powerful split AC, modern cots, tiled floors, and personal locker wardrobes.",
                "amenities": "Split AC, Free Wi-Fi, Individual Lockers, Power Backup, Housekeeping",
                "images": json.dumps(["/images/pg_room_triple.jpg", "/images/bedroom_triple_cot.png"]),
                "status": "AVAILABLE",
                "beds": [("B1", False, None), ("B2", False, None), ("B3", False, None)]
            },
            {
                "room_number": "301",
                "room_type": "FOUR_SHARING",
                "is_ac": False,
                "floor": 3,
                "capacity": 4,
                "available_beds": 3,
                "monthly_rent": 4800.0,
                "security_deposit": 3500.0,
                "description": "Spacious budget 4-sharing accommodation on the 3rd floor. Perfect for college students and entry-level IT professionals.",
                "amenities": "Free Wi-Fi, 4 Steel Lockers, Tiled Floor, 2 Ceiling Fans, Laundry Access",
                "images": json.dumps(["/images/bedroom_triple_cot.png", "/images/room_wardrobe.png"]),
                "status": "AVAILABLE",
                "beds": [("B1", True, "Suresh K"), ("B2", False, None), ("B3", False, None), ("B4", False, None)]
            },
            {
                "room_number": "302",
                "room_type": "SINGLE",
                "is_ac": True,
                "floor": 3,
                "capacity": 1,
                "available_beds": 1,
                "monthly_rent": 12000.0,
                "security_deposit": 10000.0,
                "description": "Private executive single occupancy room with dedicated split AC, large wardrobe, private work desk, and privacy.",
                "amenities": "Private Room, Split AC, Free Wi-Fi, Work Desk, Private Cupboard, Power Backup",
                "images": json.dumps(["/images/bedroom_double.png", "/images/pg_room_double.jpg"]),
                "status": "AVAILABLE",
                "beds": [("B1", False, None)]
            }
        ]

        for r_data in rooms_list:
            beds_info = r_data.pop("beds")
            room_obj = Room(**r_data)
            db.add(room_obj)
            db.commit()
            db.refresh(room_obj)

            for b_num, occ, occ_name in beds_info:
                bed_obj = RoomBed(
                    room_id=room_obj.id,
                    bed_number=b_num,
                    is_occupied=occ,
                    current_occupant_name=occ_name
                )
                db.add(bed_obj)
            db.commit()

    # 8. Seed Sample Visit Request & Booking for Demo User
    if db.query(VisitRequest).count() == 0 and demo_user:
        sample_visit = VisitRequest(
            user_id=demo_user.id,
            full_name=demo_user.full_name,
            phone=demo_user.phone,
            email=demo_user.email,
            preferred_date=(datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d"),
            preferred_time="10:00 AM",
            purpose="Room Inspection",
            number_of_visitors=1,
            message="Interested in double-sharing AC room starting next month.",
            status="APPROVED",
            confirmed_date=(datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d"),
            confirmed_time="10:00 AM",
            admin_notes="Welcome! Please contact manager at gate upon arrival."
        )
        db.add(sample_visit)

        # Notification for User
        user_notif = Notification(
            user_id=demo_user.id,
            for_admin=False,
            title="Visit Request Approved",
            message="Your PG visit appointment has been confirmed for 10:00 AM on " + (datetime.utcnow() + timedelta(days=2)).strftime("%d %b %Y") + ".",
            notification_type="VISIT",
            link="/my-visits"
        )
        db.add(user_notif)

        # Notification for Admin
        admin_notif = Notification(
            user_id=None,
            for_admin=True,
            title="New Visit Scheduled",
            message=f"Karthik Ramanathan scheduled a visit for Room Inspection at 10:00 AM.",
            notification_type="VISIT",
            link="/admin/visits"
        )
        db.add(admin_notif)

        db.commit()

    # 9. Seed Sample Contact Message
    if db.query(ContactMessage).count() == 0:
        sample_msg = ContactMessage(
            name="Vigneshwaran M",
            phone="+91 97890 12345",
            email="vicky.it@gmail.com",
            message="Hello, I am joining an IT firm near Taramani next Monday. Is 2-sharing AC room available with two-wheeler parking?",
            is_read=False
        )
        db.add(sample_msg)
        db.commit()

    # 10. Seed Sample Residents and Active Bed Allocations
    if db.query(Resident).count() == 0:
        # Resident 1: Arun Kumar
        res_arun = Resident(
            resident_code="SLPG-0001",
            full_name="Arun Kumar",
            phone="+91 99887 76655",
            email="arun.kumar@example.com",
            occupation="Software Developer",
            emergency_contact="+91 98401 99887",
            address="Native: Salem, Tamil Nadu",
            resident_status="ACTIVE"
        )
        db.add(res_arun)

        # Resident 2: Karthik Ramanathan (linked to demo user)
        res_karthik = Resident(
            resident_code="SLPG-0002",
            user_id=demo_user.id if demo_user else None,
            full_name="Karthik Ramanathan",
            phone="+91 98765 43210",
            email="karthik.r@example.com",
            occupation="Software Engineer",
            emergency_contact="+91 98401 23456",
            address="Native: Trichy, Tamil Nadu",
            resident_status="ACTIVE"
        )
        db.add(res_karthik)
        db.flush()

        # History logs
        db.add(ResidentHistory(
            resident_id=res_arun.id,
            event_type="REGISTERED",
            details="Resident Arun Kumar registered with ID SLPG-0001."
        ))
        db.add(ResidentHistory(
            resident_id=res_karthik.id,
            event_type="REGISTERED",
            details="Resident Karthik Ramanathan registered with ID SLPG-0002 (linked to website account)."
        ))

        # Bed allocations
        room_101 = db.query(Room).filter(Room.room_number == "101").first()
        if room_101 and len(room_101.beds) > 0:
            bed_1 = room_101.beds[0]
            alloc_arun = BedAllocation(
                resident_id=res_arun.id,
                bed_id=bed_1.id,
                room_id=room_101.id,
                move_in_date="2026-01-15",
                allocation_status="ACTIVE",
                notes="Standard monthly allocation."
            )
            db.add(alloc_arun)
            db.flush()
            db.add(ResidentHistory(
                resident_id=res_arun.id,
                event_type="ALLOCATED",
                room_id=room_101.id,
                bed_id=bed_1.id,
                details=f"Allocated to Room {room_101.room_number}, {bed_1.bed_number}."
            ))
            sync_room_occupancy(db, room_101.id)

        room_201 = db.query(Room).filter(Room.room_number == "201").first()
        if room_201 and len(room_201.beds) > 0:
            bed_201_1 = room_201.beds[0]
            alloc_karthik = BedAllocation(
                resident_id=res_karthik.id,
                bed_id=bed_201_1.id,
                room_id=room_201.id,
                move_in_date="2026-02-01",
                allocation_status="ACTIVE",
                notes="Allocated following verified booking request."
            )
            db.add(alloc_karthik)
            db.flush()
            db.add(ResidentHistory(
                resident_id=res_karthik.id,
                event_type="ALLOCATED",
                room_id=room_201.id,
                bed_id=bed_201_1.id,
                details=f"Allocated to Room {room_201.room_number}, {bed_201_1.bed_number}."
            ))
        db.commit()

    # 11. Ensure Room S-2 and Arun Kumar (SLPG-0001) matching specification example
    room_s2 = db.query(Room).filter(Room.room_number == "S-2").first()
    if not room_s2:
        room_s2 = Room(
            room_number="S-2",
            room_type="DOUBLE",
            sharing_type="Double Sharing",
            is_ac=True,
            floor=1,
            capacity=2,
            available_beds=1,
            monthly_rent=6000.0,
            monthly_rent_per_bed=6000.0,
            security_deposit=5000.0,
            description="Double Sharing AC room with attached washroom, individual lockers, and natural light.",
            amenities="Split AC, Free Wi-Fi, Attached Bathroom, Individual Cupboard, Hot Water",
            status="PARTIALLY_AVAILABLE"
        )
        db.add(room_s2)
        db.flush()
        bed_b1 = RoomBed(room_id=room_s2.id, bed_number="B1", bed_status="OCCUPIED", is_occupied=True, current_occupant_name="Arun Kumar")
        bed_b2 = RoomBed(room_id=room_s2.id, bed_number="B2", bed_status="AVAILABLE", is_occupied=False)
        db.add(bed_b1)
        db.add(bed_b2)
        db.commit()

    arun = db.query(Resident).filter(Resident.resident_code == "SLPG-0001").first()
    if arun:
        arun.phone = "9876543210"
        # Check active allocation
        s2_b1 = db.query(RoomBed).filter(RoomBed.room_id == room_s2.id, RoomBed.bed_number == "B1").first()
        active_arun_alloc = db.query(BedAllocation).filter(
            BedAllocation.resident_id == arun.id,
            BedAllocation.allocation_status == "ACTIVE"
        ).first()

        if active_arun_alloc:
            active_arun_alloc.room_id = room_s2.id
            if s2_b1:
                active_arun_alloc.bed_id = s2_b1.id
            active_arun_alloc.move_in_date = "2026-09-09"
            active_arun_alloc.monthly_rent = 6000.0
            active_arun_alloc.billing_day = 9
        elif s2_b1:
            new_alloc = BedAllocation(
                resident_id=arun.id,
                room_id=room_s2.id,
                bed_id=s2_b1.id,
                move_in_date="2026-09-09",
                monthly_rent=6000.0,
                billing_day=9,
                allocation_status="ACTIVE",
                notes="Allocated to Room S-2 Bed B1"
            )
            db.add(new_alloc)

        sync_room_occupancy(db, room_s2.id)
        db.commit()

        # Generate rent records for Arun
        from ..scheduler.rent_scheduler import ensure_rent_records_for_allocation
        alloc_to_sync = db.query(BedAllocation).filter(
            BedAllocation.resident_id == arun.id,
            BedAllocation.allocation_status == "ACTIVE"
        ).first()
        if alloc_to_sync:
            ensure_rent_records_for_allocation(db, alloc_to_sync)
            db.commit()

