export const DEFAULT_PG_INFO = {
  id: 1,
  name: "Sri Lakshmi Srinivasa Gents PG",
  tagline: "Comfortable PG Living in Velachery, Chennai",
  address: "3, Bhavani St, Bharathi Nagar, Velachery, Chennai, Tamil Nadu 600113",
  phone: "+91 78937 44206",
  alt_phone: "+91 90032 80430",
  email: "srilakshmisrinivasa.pg@gmail.com",
  opening_hours: "Open 24 Hours Daily",
  google_rating: "3.6 / 5 (14 Reviews)",
  about_text: "Sri Lakshmi Srinivasa Gents PG is located at Bhavani St, Bharathi Nagar, Velachery, Chennai. Convenient to Taramani IT corridor, Velachery MRTS, and 100 Feet Road.",
  rules_text: "• Gate access 24/7 with valid register/biometric entry.\n• Smoking and alcohol strictly prohibited on premises.\n• Maintain quiet hours between 11:00 PM and 6:00 AM.",
  social_links: '{"whatsapp": "+917893744206", "maps": "https://maps.google.com/?q=Sri+Lakshmi+Srinivasa+Gents+PG+Velachery"}'
};

export const DEFAULT_ROOMS = [
  {
    id: "seed-room-101",
    room_number: "101",
    room_type: "DOUBLE",
    sharing_type: "Double Sharing",
    is_ac: false,
    floor: 1,
    capacity: 2,
    available_beds: 1,
    occupied_beds: 1,
    monthly_rent: 6500.0,
    monthly_rent_per_bed: 6500.0,
    security_deposit: 5000.0,
    description: "Well-ventilated double sharing room on the first floor with twin cots, red mattresses, individual lockers, and ceiling fan.",
    amenities: "Free Wi-Fi, Ceiling Fan, Individual Cupboard, Hot Water, Daily Housekeeping",
    images: JSON.stringify(["/images/bedroom_double.png", "/images/pg_room_double.jpg"]),
    status: "PARTIALLY_AVAILABLE",
    beds: [
      { id: "b1-101", bed_number: "Bed 1", bed_status: "OCCUPIED", is_occupied: true, current_occupant_name: "Karthik R" },
      { id: "b2-101", bed_number: "Bed 2", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null }
    ]
  },
  {
    id: "seed-room-102",
    room_number: "102",
    room_type: "DOUBLE",
    sharing_type: "Double Sharing",
    is_ac: true,
    floor: 1,
    capacity: 2,
    available_beds: 2,
    occupied_beds: 0,
    monthly_rent: 8500.0,
    monthly_rent_per_bed: 8500.0,
    security_deposit: 6000.0,
    description: "Cool air-conditioned double sharing room with split AC, attached washroom, comfortable red mattress cots, and study table.",
    amenities: "Split AC, Free Wi-Fi, Attached Bathroom, Individual Cupboard, Hot Water",
    images: JSON.stringify(["/images/pg_room_double.jpg", "/images/bedroom_double.png"]),
    status: "AVAILABLE",
    beds: [
      { id: "b1-102", bed_number: "Bed 1", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null },
      { id: "b2-102", bed_number: "Bed 2", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null }
    ]
  },
  {
    id: "seed-room-201",
    room_number: "201",
    room_type: "TRIPLE",
    sharing_type: "Triple Sharing",
    is_ac: false,
    floor: 2,
    capacity: 3,
    available_beds: 2,
    occupied_beds: 1,
    monthly_rent: 5500.0,
    monthly_rent_per_bed: 5500.0,
    security_deposit: 4000.0,
    description: "Economical 3-sharing room on second floor with balcony cross-ventilation, feature wall finish, and individual storage wardrobes.",
    amenities: "Free Wi-Fi, Individual Steel Cupboard, Ceiling Fans, Balcony Access, Hot Water",
    images: JSON.stringify(["/images/bedroom_triple_wallpaper.png", "/images/pg_room_triple.jpg"]),
    status: "AVAILABLE",
    beds: [
      { id: "b1-201", bed_number: "Bed 1", bed_status: "OCCUPIED", is_occupied: true, current_occupant_name: "Rahul S" },
      { id: "b2-201", bed_number: "Bed 2", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null },
      { id: "b3-201", bed_number: "Bed 3", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null }
    ]
  },
  {
    id: "seed-room-202",
    room_number: "202",
    room_type: "TRIPLE",
    sharing_type: "Triple Sharing",
    is_ac: true,
    floor: 2,
    capacity: 3,
    available_beds: 3,
    occupied_beds: 0,
    monthly_rent: 7500.0,
    monthly_rent_per_bed: 7500.0,
    security_deposit: 5500.0,
    description: "Executive air-conditioned 3-sharing room with powerful split AC, modern headboards, individual wardrobes, and high-speed Wi-Fi.",
    amenities: "Split AC, High-Speed Wi-Fi, Individual Wardrobe, Geyser, Regular Housekeeping",
    images: JSON.stringify(["/images/pg_room_triple.jpg", "/images/bedroom_triple_cot.png"]),
    status: "AVAILABLE",
    beds: [
      { id: "b1-202", bed_number: "Bed 1", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null },
      { id: "b2-202", bed_number: "Bed 2", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null },
      { id: "b3-202", bed_number: "Bed 3", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null }
    ]
  },
  {
    id: "seed-room-301",
    room_number: "301",
    room_type: "FOUR_SHARING",
    sharing_type: "Four Sharing",
    is_ac: false,
    floor: 3,
    capacity: 4,
    available_beds: 3,
    occupied_beds: 1,
    monthly_rent: 4500.0,
    monthly_rent_per_bed: 4500.0,
    security_deposit: 3500.0,
    description: "Budget-friendly 4-sharing accommodation on the third floor with high ceilings, plenty of daylight, and terrace utility access.",
    amenities: "Free Wi-Fi, Personal Almirah, Terrace Access, Daily Housekeeping, RO Water",
    images: JSON.stringify(["/images/bedroom_triple_cot.png", "/images/room_wardrobe.png"]),
    status: "AVAILABLE",
    beds: [
      { id: "b1-301", bed_number: "Bed 1", bed_status: "OCCUPIED", is_occupied: true, current_occupant_name: "Praveen V" },
      { id: "b2-301", bed_number: "Bed 2", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null },
      { id: "b3-301", bed_number: "Bed 3", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null },
      { id: "b4-301", bed_number: "Bed 4", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null }
    ]
  },
  {
    id: "seed-room-302",
    room_number: "302",
    room_type: "SINGLE",
    sharing_type: "Single Sharing",
    is_ac: true,
    floor: 3,
    capacity: 1,
    available_beds: 1,
    occupied_beds: 0,
    monthly_rent: 12000.0,
    monthly_rent_per_bed: 12000.0,
    security_deposit: 10000.0,
    description: "Private single room for working professionals seeking complete quiet and personal space, equipped with split AC and dedicated desk.",
    amenities: "Private Room, Split AC, Dedicated Study Desk, Steel Cupboard, High-Speed Wi-Fi",
    images: JSON.stringify(["/images/bedroom_double.png", "/images/pg_room_double.jpg"]),
    status: "AVAILABLE",
    beds: [
      { id: "b1-302", bed_number: "Bed 1", bed_status: "AVAILABLE", is_occupied: false, current_occupant_name: null }
    ]
  }
];

export const DEFAULT_FACILITIES = [
  { id: 1, title: "Free High-Speed Wi-Fi", category: "essential", description: "High-speed optic fiber Wi-Fi access on every floor for work from home and streaming.", icon: "wifi", display_order: 1 },
  { id: 2, title: "24/7 Security & CCTV", category: "security", description: "Around-the-clock physical security watch with CCTV coverage in common corridors and gates.", icon: "shield-check", display_order: 2 },
  { id: 3, title: "Washing Machine Facility", category: "convenience", description: "Fully automatic washing machines located in a dedicated covered laundry terrace area.", icon: "droplet", display_order: 3 },
  { id: 4, title: "AC & Non-AC Rooms", category: "comfort", description: "Choice of energy-efficient split air conditioning or well-ventilated cross-breeze rooms.", icon: "wind", display_order: 4 },
  { id: 5, title: "Purified RO Drinking Water", category: "essential", description: "Commercial stainless steel RO water purifier and chiller providing clean drinking water 24/7.", icon: "cup-straw", display_order: 5 },
  { id: 6, title: "Power Backup", category: "essential", description: "Inverter backup system ensuring uninterrupted lighting, fans, and internet connectivity.", icon: "lightning-charge", display_order: 6 },
  { id: 7, title: "Daily Housekeeping", category: "convenience", description: "Regular cleaning of common areas, bathrooms, and corridors for hygienic living.", icon: "stars", display_order: 7 },
  { id: 8, title: "Two-Wheeler Parking", category: "convenience", description: "Safe gated parking inside the building compound for bikes and scooters.", icon: "bicycle", display_order: 8 },
  { id: 9, title: "Individual Steel Lockers", category: "security", description: "Every resident receives an individual steel wardrobe/almirah with personal key lock.", icon: "lock", display_order: 9 },
  { id: 10, title: "Hot Water Geysers", category: "comfort", description: "Electric water heaters installed in bathrooms for instant hot showers.", icon: "thermometer-sun", display_order: 10 },
  { id: 11, title: "Open 24 Hours Access", category: "convenience", description: "Flexible access suitable for working professionals with rotational or night shifts.", icon: "clock", display_order: 11 },
  { id: 12, title: "Spacious Dining Area", category: "comfort", description: "Clean and orderly communal dining space with tables and chairs.", icon: "building", display_order: 12 }
];

export const DEFAULT_GALLERY = [
  { id: 1, title: "Real Building Exterior", category: "Exterior", image_url: "/images/exterior_main.png", caption: "Real exterior of Sri Lakshmi Srinivasa Gents PG at Bhavani St, Velachery", is_featured: true, is_authentic: true, display_order: 1 },
  { id: 2, title: "Official PG Signboard", category: "Signboard", image_url: "/images/signboard.png", caption: "Official signboard displaying phone numbers: 78937 44206 / 90032 80430", is_featured: true, is_authentic: true, display_order: 2 },
  { id: 3, title: "Authentic Double Bed Room", category: "Bedrooms", image_url: "/images/bedroom_double.png", caption: "Real room photo showing twin beds with signature red mattresses", is_featured: true, is_authentic: true, display_order: 3 },
  { id: 4, title: "Triple Sharing Room Interior", category: "Bedrooms", image_url: "/images/bedroom_triple_wallpaper.png", caption: "Real bedroom showing 3 cots and wallpaper decor in Velachery PG", is_featured: true, is_authentic: true, display_order: 4 },
  { id: 5, title: "Cots & Headboard Setup", category: "Bedrooms", image_url: "/images/bedroom_triple_cot.png", caption: "Actual wooden cot setup with headboards and red bedsheets", is_featured: false, is_authentic: true, display_order: 5 },
  { id: 6, title: "Room Interior with Wardrobe", category: "Bedrooms", image_url: "/images/room_wardrobe.png", caption: "Actual room view featuring personal steel storage wardrobe", is_featured: false, is_authentic: true, display_order: 6 },
  { id: 7, title: "Building Modern Facade", category: "Exterior", image_url: "/images/building_facade.png", caption: "Real view of balconies, glass railings, and modern exterior finish", is_featured: false, is_authentic: true, display_order: 7 },
  { id: 8, title: "Outdoor Surroundings", category: "Surroundings", image_url: "/images/outdoor_garden.png", caption: "Outdoor green foliage and quiet residential street in Bhavani St", is_featured: false, is_authentic: true, display_order: 8 },
  { id: 9, title: "High-Res Property Facade", category: "Exterior", image_url: "/images/pg_exterior_main.jpg", caption: "Architectural street perspective of Sri Lakshmi Srinivasa Gents PG", is_featured: true, is_authentic: false, display_order: 9 },
  { id: 10, title: "Double Sharing AC Room", category: "Bedrooms", image_url: "/images/pg_room_double.jpg", caption: "Spacious 2-sharing bedroom with matching red beds and natural light", is_featured: true, is_authentic: false, display_order: 10 },
  { id: 11, title: "Triple Sharing Executive Room", category: "Bedrooms", image_url: "/images/pg_room_triple.jpg", caption: "Clean 3-sharing accommodation with individual wardrobes and ceiling fan", is_featured: false, is_authentic: false, display_order: 11 },
  { id: 12, title: "Terrace Laundry Utility", category: "Facilities", image_url: "/images/pg_washing_amenity.jpg", caption: "Covered terrace laundry zone with automatic washing machines", is_featured: true, is_authentic: false, display_order: 12 },
  { id: 13, title: "Common Dining & RO Water", category: "Facilities", image_url: "/images/pg_dining_water.jpg", caption: "Clean dining tables and commercial RO drinking water dispenser", is_featured: true, is_authentic: false, display_order: 13 }
];
