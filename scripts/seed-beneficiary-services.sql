-- Seed Beneficiary Services
-- Individual Services (one-to-one)

INSERT INTO services (name, description, type, category, isActive) VALUES
('Voter Registration Assistance', 'Help voters with registration process and documentation', 'one-to-one', 'voter_registration', true),
('Aadhar Card Applications', 'Assist with Aadhar card applications and updates', 'one-to-one', 'aadhar_card', true),
('Ration Card Applications', 'Help with ration card applications and renewals', 'one-to-one', 'ration_card', true),
('Government Scheme Applications', 'Assist with various government scheme applications', 'one-to-one', 'schemes', true),
('Pension Applications', 'Help with pension applications and disbursements', 'one-to-one', 'pension', true),
('Disability Certificate', 'Assist with disability certificate applications', 'one-to-one', 'disability', true),
('Income Certificate', 'Help with income certificate applications', 'one-to-one', 'income_certificate', true),
('Caste Certificate', 'Assist with caste certificate applications', 'one-to-one', 'caste_certificate', true);

-- Display summary
SELECT 
  type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as services
FROM services 
WHERE isActive = true 
GROUP BY type 
ORDER BY type; 