-- Insert sample campus buildings
INSERT INTO buildings (name, category, description, hours, phone, website, x, y, services) VALUES
('Main Library', 'academic', 'Central library with study spaces and research facilities', '24/7 during semester', '(555) 123-4567', 'library.university.edu', 300, 200, '["Study Rooms", "Computer Lab", "Printing", "Research Help"]'),
('Student Union', 'dining', 'Food court, bookstore, and student services', '6:00 AM - 11:00 PM', '(555) 123-4568', 'union.university.edu', 400, 250, '["Food Court", "Bookstore", "ATM", "Student Services"]'),
('Science Building', 'academic', 'Chemistry, Physics, and Biology laboratories', '7:00 AM - 10:00 PM', '(555) 123-4569', NULL, 200, 150, '["Labs", "Lecture Halls", "Faculty Offices"]'),
('Engineering Hall', 'academic', 'Engineering departments and computer labs', '7:00 AM - 10:00 PM', '(555) 123-4570', NULL, 500, 180, '["Computer Labs", "Workshop", "3D Printing"]'),
('Residence Hall A', 'residential', 'Freshman dormitory with dining hall', '24/7', '(555) 123-4571', NULL, 150, 350, '["Laundry", "Common Room", "Study Lounge"]'),
('Residence Hall B', 'residential', 'Upper-class student housing', '24/7', '(555) 123-4572', NULL, 250, 380, '["Laundry", "Kitchen", "Recreation Room"]'),
('Recreation Center', 'recreation', 'Fitness center, pool, and sports facilities', '5:00 AM - 11:00 PM', '(555) 123-4573', NULL, 450, 350, '["Gym", "Pool", "Courts", "Classes"]'),
('Administration Building', 'administrative', 'Admissions, registrar, and financial aid', '8:00 AM - 5:00 PM', '(555) 123-4574', NULL, 350, 100, '["Admissions", "Registrar", "Financial Aid"]'),
('Parking Garage', 'parking', 'Multi-level parking structure', '24/7', NULL, NULL, 100, 280, '["Covered Parking", "EV Charging", "Security"]'),
('Campus Green', 'outdoor', 'Central quad and outdoor gathering space', '24/7', NULL, NULL, 320, 280, '["Events", "Study Space", "Recreation"]');
