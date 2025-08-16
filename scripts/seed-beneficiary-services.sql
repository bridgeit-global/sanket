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

-- Community Services (one-to-many)

INSERT INTO services (name, description, type, category, isActive) VALUES
('Road Construction Projects', 'Public work for road construction affecting multiple voters', 'one-to-many', 'public_works', true),
('Fund Utilization Projects', 'Track fund utilization for development projects', 'one-to-many', 'fund_utilization', true),
('Issue Visibility Campaigns', 'Campaigns to highlight local issues and concerns', 'one-to-many', 'issue_visibility', true),
('Water Supply Projects', 'Community water supply and infrastructure projects', 'one-to-many', 'water_supply', true),
('Sanitation Projects', 'Community sanitation and waste management projects', 'one-to-many', 'sanitation', true),
('Street Lighting', 'Community street lighting and electrical projects', 'one-to-many', 'street_lighting', true),
('Public Health Campaigns', 'Community health awareness and vaccination drives', 'one-to-many', 'public_health', true),
('Educational Programs', 'Community educational and skill development programs', 'one-to-many', 'education', true);

-- Display summary
SELECT 
  type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as services
FROM services 
WHERE isActive = true 
GROUP BY type 
ORDER BY type; 