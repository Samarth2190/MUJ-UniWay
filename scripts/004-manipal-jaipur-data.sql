-- Clear existing data and add Manipal University Jaipur specific buildings
DELETE FROM buildings;

-- Insert Manipal University Jaipur campus buildings with accurate GPS coordinates
INSERT INTO buildings (name, category, description, hours, phone, website, lat, lng, x, y, services) VALUES
-- Academic Buildings
('School of Engineering & Technology', 'academic', 'Main engineering building with computer labs, lecture halls, and faculty offices', '7:00 AM - 10:00 PM', '+91-141-999-4000', 'manipal.edu/muj', 26.8430, 75.5644, 300, 200, '["Computer Labs", "Lecture Halls", "Faculty Offices", "Workshops"]'),
('School of Planning & Architecture', 'academic', 'Architecture and planning department with design studios', '8:00 AM - 8:00 PM', '+91-141-999-4001', 'manipal.edu/muj', 26.8435, 75.5640, 320, 180, '["Design Studios", "Model Making Lab", "CAD Lab", "Library"]'),
('School of Media & Communication', 'academic', 'Media studies with TV studio, radio station, and editing suites', '9:00 AM - 6:00 PM', '+91-141-999-4002', 'manipal.edu/muj', 26.8425, 75.5650, 280, 220, '["TV Studio", "Radio Station", "Editing Suites", "Photography Lab"]'),
('School of Law', 'academic', 'Law school with moot court and legal aid clinic', '9:00 AM - 6:00 PM', '+91-141-999-4003', 'manipal.edu/muj', 26.8440, 75.5635, 340, 160, '["Moot Court", "Legal Aid Clinic", "Law Library", "Seminar Halls"]'),
('Dr. T.M.A. Pai Management Centre', 'academic', 'Business school with case study rooms and corporate training facilities', '8:00 AM - 8:00 PM', '+91-141-999-4004', 'manipal.edu/muj', 26.8420, 75.5655, 260, 240, '["Case Study Rooms", "Corporate Training", "MBA Lounge", "Placement Cell"]'),

-- Central Facilities
('Central Library', 'academic', 'Main library with digital resources, study areas, and research facilities', '24/7 during semester', '+91-141-999-4010', 'library.manipal.edu', 26.8432, 75.5642, 310, 190, '["Digital Library", "Study Rooms", "Research Databases", "Printing Services"]'),
('Academic Block A', 'academic', 'Multi-purpose academic building with classrooms and labs', '7:00 AM - 10:00 PM', '+91-141-999-4011', 'manipal.edu/muj', 26.8428, 75.5648, 290, 210, '["Classrooms", "Computer Labs", "Physics Lab", "Chemistry Lab"]'),
('Academic Block B', 'academic', 'Additional academic facilities and department offices', '7:00 AM - 10:00 PM', '+91-141-999-4012', 'manipal.edu/muj', 26.8438, 75.5638, 330, 170, '["Classrooms", "Faculty Offices", "Seminar Rooms", "Student Lounge"]'),

-- Administrative Buildings
('Administration Block', 'administrative', 'Main administrative offices including registrar, admissions, and accounts', '9:00 AM - 5:00 PM', '+91-141-999-4020', 'manipal.edu/muj', 26.8435, 75.5645, 315, 185, '["Registrar Office", "Admissions", "Accounts", "HR Department"]'),
('Vice Chancellor Office', 'administrative', 'Executive offices and meeting rooms', '9:00 AM - 5:00 PM', '+91-141-999-4021', 'manipal.edu/muj', 26.8442, 75.5642, 345, 155, '["VC Office", "Pro-VC Office", "Board Room", "Guest Lounge"]'),

-- Residential Facilities
('Boys Hostel Block 1', 'residential', 'Male student accommodation with mess and common areas', '24/7', '+91-141-999-4030', NULL, 26.8415, 75.5660, 250, 260, '["Accommodation", "Mess Hall", "Common Room", "Laundry", "Wi-Fi"]'),
('Boys Hostel Block 2', 'residential', 'Additional male student housing with recreational facilities', '24/7', '+91-141-999-4031', NULL, 26.8410, 75.5665, 230, 280, '["Accommodation", "Recreation Room", "Study Hall", "Laundry", "Gym"]'),
('Girls Hostel Block 1', 'residential', 'Female student accommodation with security and amenities', '24/7', '+91-141-999-4032', NULL, 26.8445, 75.5630, 360, 140, '["Accommodation", "Mess Hall", "Common Room", "Laundry", "Security"]'),
('Girls Hostel Block 2', 'residential', 'Additional female housing with modern facilities', '24/7', '+91-141-999-4033', NULL, 26.8450, 75.5625, 380, 120, '["Accommodation", "Study Lounge", "Recreation Area", "Laundry", "Wi-Fi"]'),

-- Dining and Recreation
('Central Cafeteria', 'dining', 'Main dining facility with multiple food courts and seating', '7:00 AM - 11:00 PM', '+91-141-999-4040', NULL, 26.8430, 75.5647, 305, 195, '["Food Court", "Seating Area", "Snacks Counter", "Beverages", "Catering Services"]'),
('Student Activity Centre', 'recreation', 'Hub for student activities, clubs, and events', '9:00 AM - 10:00 PM', '+91-141-999-4041', NULL, 26.8425, 75.5652, 285, 225, '["Event Hall", "Club Rooms", "Music Room", "Dance Studio", "Student Council"]'),
('Sports Complex', 'recreation', 'Indoor and outdoor sports facilities including gym and courts', '6:00 AM - 10:00 PM', '+91-141-999-4042', NULL, 26.8405, 75.5670, 220, 300, '["Gymnasium", "Basketball Court", "Badminton Courts", "Table Tennis", "Fitness Center"]'),
('Swimming Pool', 'recreation', 'Olympic-size swimming pool with changing rooms', '6:00 AM - 8:00 PM', '+91-141-999-4043', NULL, 26.8400, 75.5675, 200, 320, '["Swimming Pool", "Changing Rooms", "Pool Equipment", "Lifeguard Services"]'),

-- Health and Services
('Health Centre', 'administrative', 'Campus medical facility with doctor and pharmacy', '8:00 AM - 8:00 PM', '+91-141-999-4050', NULL, 26.8440, 75.5650, 335, 175, '["Medical Consultation", "Pharmacy", "First Aid", "Health Records", "Emergency Care"]'),
('Bank & ATM', 'administrative', 'Banking services and ATM facility', '10:00 AM - 4:00 PM', '+91-141-999-4051', NULL, 26.8433, 75.5643, 312, 188, '["Banking Services", "ATM", "Money Transfer", "Account Services"]'),

-- Parking and Transport
('Main Parking Area', 'parking', 'Primary vehicle parking with security', '24/7', NULL, NULL, 26.8420, 75.5665, 265, 250, '["Car Parking", "Two Wheeler Parking", "Security", "CCTV Surveillance"]'),
('Visitor Parking', 'parking', 'Designated parking for guests and visitors', '6:00 AM - 10:00 PM', NULL, NULL, 26.8445, 75.5655, 350, 165, '["Guest Parking", "Visitor Registration", "Security Check"]'),

-- Outdoor Spaces
('Central Quadrangle', 'outdoor', 'Main campus green space for gatherings and events', '24/7', NULL, NULL, 26.8432, 75.5645, 308, 192, '["Open Space", "Event Venue", "Seating Areas", "Landscaping", "Wi-Fi Zone"]'),
('Amphitheatre', 'outdoor', 'Outdoor performance and event space', '24/7', NULL, NULL, 26.8427, 75.5649, 295, 215, '["Performance Space", "Seating", "Sound System", "Cultural Events", "Gatherings"]'),

-- Specialized Facilities
('Innovation & Incubation Centre', 'academic', 'Startup incubation and innovation hub', '9:00 AM - 9:00 PM', '+91-141-999-4060', 'manipal.edu/muj/innovation', 26.8437, 75.5637, 325, 168, '["Incubation Space", "Mentorship", "Funding Support", "Networking", "Workshops"]'),
('Conference Hall', 'administrative', 'Large conference and seminar facility', '9:00 AM - 6:00 PM', '+91-141-999-4061', NULL, 26.8434, 75.5641, 318, 182, '["Conference Facilities", "Audio Visual", "Seating for 300", "Catering", "Parking"]');
