import { INDIAN_STATES } from '@/lib/letters/pincode-lookup';

export { INDIAN_STATES };

/** Major cities / districts keyed by English state name. */
export const CITIES_BY_STATE: Record<string, readonly string[]> = {
  'Andhra Pradesh': [
    'Anantapur',
    'Chittoor',
    'East Godavari',
    'Guntur',
    'Kadapa',
    'Krishna',
    'Kurnool',
    'Nellore',
    'Prakasam',
    'Srikakulam',
    'Visakhapatnam',
    'Vizianagaram',
    'West Godavari',
  ],
  'Arunachal Pradesh': [
    'Changlang',
    'East Kameng',
    'East Siang',
    'Itanagar',
    'Lohit',
    'Lower Subansiri',
    'Papum Pare',
    'Tawang',
    'Tirap',
    'Upper Siang',
    'Upper Subansiri',
    'West Kameng',
    'West Siang',
  ],
  Assam: [
    'Barpeta',
    'Cachar',
    'Darrang',
    'Dibrugarh',
    'Goalpara',
    'Golaghat',
    'Guwahati',
    'Jorhat',
    'Kamrup',
    'Karbi Anglong',
    'Karimganj',
    'Lakhimpur',
    'Nagaon',
    'Sivasagar',
    'Sonitpur',
    'Tinsukia',
  ],
  Bihar: [
    'Arrah',
    'Aurangabad',
    'Begusarai',
    'Bhagalpur',
    'Bhojpur',
    'Darbhanga',
    'Gaya',
    'Muzaffarpur',
    'Nalanda',
    'Patna',
    'Purnia',
    'Saharsa',
    'Samastipur',
    'Saran',
    'Siwan',
  ],
  Chhattisgarh: [
    'Bastar',
    'Bilaspur',
    'Durg',
    'Jagdalpur',
    'Korba',
    'Raigarh',
    'Raipur',
    'Rajnandgaon',
  ],
  Goa: ['North Goa', 'Panaji', 'South Goa', 'Vasco da Gama'],
  Gujarat: [
    'Ahmedabad',
    'Amreli',
    'Anand',
    'Bharuch',
    'Bhavnagar',
    'Gandhinagar',
    'Jamnagar',
    'Junagadh',
    'Kutch',
    'Mehsana',
    'Rajkot',
    'Surat',
    'Vadodara',
    'Valsad',
  ],
  Haryana: [
    'Ambala',
    'Faridabad',
    'Gurugram',
    'Hisar',
    'Karnal',
    'Kurukshetra',
    'Panipat',
    'Rohtak',
    'Sonipat',
    'Yamunanagar',
  ],
  'Himachal Pradesh': [
    'Bilaspur',
    'Chamba',
    'Hamirpur',
    'Kangra',
    'Kullu',
    'Mandi',
    'Shimla',
    'Sirmaur',
    'Solan',
    'Una',
  ],
  Jharkhand: [
    'Bokaro',
    'Dhanbad',
    'Dumka',
    'Hazaribagh',
    'Jamshedpur',
    'Ranchi',
    'Deoghar',
    'Giridih',
  ],
  Karnataka: [
    'Ballari',
    'Belagavi',
    'Bengaluru',
    'Bidar',
    'Chikkamagaluru',
    'Dakshina Kannada',
    'Dharwad',
    'Gulbarga',
    'Hassan',
    'Hubballi',
    'Mangaluru',
    'Mysuru',
    'Shivamogga',
    'Tumakuru',
    'Udupi',
  ],
  Kerala: [
    'Alappuzha',
    'Ernakulam',
    'Idukki',
    'Kannur',
    'Kasaragod',
    'Kollam',
    'Kottayam',
    'Kozhikode',
    'Malappuram',
    'Palakkad',
    'Pathanamthitta',
    'Thiruvananthapuram',
    'Thrissur',
    'Wayanad',
  ],
  'Madhya Pradesh': [
    'Bhopal',
    'Gwalior',
    'Indore',
    'Jabalpur',
    'Rewa',
    'Sagar',
    'Satna',
    'Ujjain',
  ],
  Maharashtra: [
    'Ahmednagar',
    'Akola',
    'Amravati',
    'Aurangabad',
    'Beed',
    'Bhandara',
    'Buldhana',
    'Chandrapur',
    'Dhule',
    'Gadchiroli',
    'Gondia',
    'Hingoli',
    'Jalgaon',
    'Jalna',
    'Kolhapur',
    'Latur',
    'Mumbai',
    'Mumbai Suburban',
    'Nagpur',
    'Nanded',
    'Nandurbar',
    'Nashik',
    'Osmanabad',
    'Palghar',
    'Parbhani',
    'Pune',
    'Raigad',
    'Ratnagiri',
    'Sangli',
    'Satara',
    'Sindhudurg',
    'Solapur',
    'Thane',
    'Wardha',
    'Washim',
    'Yavatmal',
  ],
  Manipur: ['Bishnupur', 'Churachandpur', 'Imphal', 'Senapati', 'Thoubal', 'Ukhrul'],
  Meghalaya: ['East Garo Hills', 'East Khasi Hills', 'Jaintia Hills', 'Shillong', 'West Garo Hills', 'West Khasi Hills'],
  Mizoram: ['Aizawl', 'Champhai', 'Kolasib', 'Lunglei', 'Mamit', 'Serchhip'],
  Nagaland: ['Dimapur', 'Kohima', 'Mokokchung', 'Mon', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
  Odisha: [
    'Angul',
    'Balasore',
    'Bargarh',
    'Bhadrak',
    'Cuttack',
    'Ganjam',
    'Jharsuguda',
    'Kendrapara',
    'Khordha',
    'Puri',
    'Rourkela',
    'Sambalpur',
  ],
  Punjab: [
    'Amritsar',
    'Bathinda',
    'Faridkot',
    'Fatehgarh Sahib',
    'Ferozepur',
    'Gurdaspur',
    'Hoshiarpur',
    'Jalandhar',
    'Ludhiana',
    'Mohali',
    'Patiala',
    'Rupnagar',
    'Sangrur',
  ],
  Rajasthan: [
    'Ajmer',
    'Alwar',
    'Bikaner',
    'Bhilwara',
    'Chittorgarh',
    'Jaipur',
    'Jaisalmer',
    'Jodhpur',
    'Kota',
    'Sikar',
    'Udaipur',
  ],
  Sikkim: ['East Sikkim', 'Gangtok', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
  'Tamil Nadu': [
    'Chennai',
    'Coimbatore',
    'Cuddalore',
    'Dindigul',
    'Erode',
    'Kanchipuram',
    'Madurai',
    'Salem',
    'Thanjavur',
    'Tiruchirappalli',
    'Tirunelveli',
    'Tiruppur',
    'Vellore',
  ],
  Telangana: [
    'Adilabad',
    'Hyderabad',
    'Karimnagar',
    'Khammam',
    'Mahbubnagar',
    'Medak',
    'Nalgonda',
    'Nizamabad',
    'Rangareddy',
    'Warangal',
  ],
  Tripura: ['Agartala', 'Dhalai', 'North Tripura', 'South Tripura', 'West Tripura'],
  'Uttar Pradesh': [
    'Agra',
    'Aligarh',
    'Allahabad',
    'Bareilly',
    'Ghaziabad',
    'Gorakhpur',
    'Jhansi',
    'Kanpur',
    'Lucknow',
    'Mathura',
    'Meerut',
    'Moradabad',
    'Noida',
    'Prayagraj',
    'Varanasi',
  ],
  Uttarakhand: [
    'Dehradun',
    'Haridwar',
    'Nainital',
    'Rishikesh',
    'Roorkee',
    'Rudrapur',
    'Udham Singh Nagar',
  ],
  'West Bengal': [
    'Asansol',
    'Bardhaman',
    'Darjeeling',
    'Durgapur',
    'Howrah',
    'Kolkata',
    'Malda',
    'Murshidabad',
    'Nadia',
    'North 24 Parganas',
    'Siliguri',
    'South 24 Parganas',
  ],
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'Port Blair', 'South Andaman'],
  Chandigarh: ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  Delhi: [
    'Central Delhi',
    'East Delhi',
    'New Delhi',
    'North Delhi',
    'North East Delhi',
    'North West Delhi',
    'Shahdara',
    'South Delhi',
    'South East Delhi',
    'South West Delhi',
    'West Delhi',
  ],
  'Jammu and Kashmir': ['Anantnag', 'Baramulla', 'Jammu', 'Kathua', 'Pulwama', 'Srinagar', 'Udhampur'],
  Ladakh: ['Kargil', 'Leh'],
  Lakshadweep: ['Kavaratti'],
  Puducherry: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
};

export const DEFAULT_STATE = 'Maharashtra';
export const DEFAULT_CITY = 'Mumbai';

/** English state name → Marathi display label. */
export const STATE_LABELS_MR: Record<string, string> = {
  'Andhra Pradesh': 'आंध्र प्रदेश',
  'Arunachal Pradesh': 'अरुणाचल प्रदेश',
  Assam: 'आसाम',
  Bihar: 'बिहार',
  Chhattisgarh: 'छत्तीसगड',
  Goa: 'गोवा',
  Gujarat: 'गुजरात',
  Haryana: 'हरियाणा',
  'Himachal Pradesh': 'हिमाचल प्रदेश',
  Jharkhand: 'झारखंड',
  Karnataka: 'कर्नाटक',
  Kerala: 'केरळ',
  'Madhya Pradesh': 'मध्य प्रदेश',
  Maharashtra: 'महाराष्ट्र',
  Manipur: 'मणिपूर',
  Meghalaya: 'मेघालय',
  Mizoram: 'मिझोरम',
  Nagaland: 'नागालँड',
  Odisha: 'ओडिशा',
  Punjab: 'पंजाब',
  Rajasthan: 'राजस्थान',
  Sikkim: 'सिक्किम',
  'Tamil Nadu': 'तामिळनाडू',
  Telangana: 'तेलंगणा',
  Tripura: 'त्रिपुरा',
  'Uttar Pradesh': 'उत्तर प्रदेश',
  Uttarakhand: 'उत्तराखंड',
  'West Bengal': 'पश्चिम बंगाल',
  'Andaman and Nicobar Islands': 'अंदमान आणि निकोबार',
  Chandigarh: 'चंदीगड',
  'Dadra and Nagar Haveli and Daman and Diu': 'दादरा आणि नगर हवेली आणि दमण आणि दीव',
  Delhi: 'दिल्ली',
  'Jammu and Kashmir': 'जम्मू आणि काश्मीर',
  Ladakh: 'लडाख',
  Lakshadweep: 'लक्षद्वीप',
  Puducherry: 'पुडुचेरी',
};

/** English city name → Marathi display label (Maharashtra + common cities). */
export const CITY_LABELS_MR: Record<string, string> = {
  Ahmednagar: 'अहमदनगर',
  Akola: 'अकोला',
  Amravati: 'अमरावती',
  Aurangabad: 'औरंगाबाद',
  Beed: 'बीड',
  Bhandara: 'भंडारा',
  Buldhana: 'बुलढाणा',
  Chandrapur: 'चंद्रपूर',
  Dhule: 'धुळे',
  Gadchiroli: 'गडचिरोली',
  Gondia: 'गोंदिया',
  Hingoli: 'हिंगोली',
  Jalgaon: 'जळगाव',
  Jalna: 'जालना',
  Kolhapur: 'कोल्हापूर',
  Latur: 'लातूर',
  Mumbai: 'मुंबई',
  'Mumbai Suburban': 'मुंबई उपनगर',
  Nagpur: 'नागपूर',
  Nanded: 'नांदेड',
  Nandurbar: 'नंदुरबार',
  Nashik: 'नाशिक',
  Osmanabad: 'उस्मानाबाद',
  Palghar: 'पालघर',
  Parbhani: 'परभणी',
  Pune: 'पुणे',
  Raigad: 'रायगड',
  Ratnagiri: 'रत्नागिरी',
  Sangli: 'सांगली',
  Satara: 'सातारा',
  Sindhudurg: 'सिंधुदुर्ग',
  Solapur: 'सोलापूर',
  Thane: 'ठाणे',
  Wardha: 'वर्धा',
  Washim: 'वाशिम',
  Yavatmal: 'यवतमाळ',
  Delhi: 'दिल्ली',
  'New Delhi': 'नवी दिल्ली',
  Bengaluru: 'बेंगलुरु',
  Chennai: 'चेन्नई',
  Kolkata: 'कोलकाता',
  Hyderabad: 'हैदराबाद',
  Ahmedabad: 'अहमदाबाद',
  Jaipur: 'जयपुर',
  Lucknow: 'लखनऊ',
  Kanpur: 'कानपूर',
};

const STATE_ALIASES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(STATE_LABELS_MR).map(([en, mr]) => [mr, en]),
  ),
  छत्तीसगढ़: 'Chhattisgarh',
  केरल: 'Kerala',
  तेलंगाना: 'Telangana',
  तमिलनाडु: 'Tamil Nadu',
  पश्चिमबंगाल: 'West Bengal',
  मध्यप्रदेश: 'Madhya Pradesh',
  आंध्रप्रदेश: 'Andhra Pradesh',
  असम: 'Assam',
};

const CITY_ALIASES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(CITY_LABELS_MR).map(([en, mr]) => [mr, en]),
  ),
};

export function normalizeStateName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (STATE_ALIASES[trimmed]) return STATE_ALIASES[trimmed];
  const match = INDIAN_STATES.find(
    (state) => state.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
}

export function normalizeCityName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (CITY_ALIASES[trimmed]) return CITY_ALIASES[trimmed];
  return trimmed;
}

export function getStateLabel(state: string, locale: 'en' | 'mr'): string {
  const normalized = normalizeStateName(state);
  if (!normalized) return '';
  if (locale === 'mr') return STATE_LABELS_MR[normalized] ?? normalized;
  return normalized;
}

export function getCityLabel(city: string, locale: 'en' | 'mr'): string {
  const normalized = normalizeCityName(city);
  if (!normalized) return '';
  if (locale === 'mr') return CITY_LABELS_MR[normalized] ?? normalized;
  return normalized;
}

export function getCitiesForState(state: string): string[] {
  const normalized = normalizeStateName(state);
  const cities = CITIES_BY_STATE[normalized];
  return cities ? [...cities] : [];
}

export function isCityInState(city: string, state: string): boolean {
  const normalizedCity = normalizeCityName(city);
  if (!normalizedCity) return false;
  return getCitiesForState(state).some(
    (item) => item.toLowerCase() === normalizedCity.toLowerCase(),
  );
}

/** Canonical English + Marathi pair for a selected state. */
export function localizedStateParts(state: string): { stateEn: string; stateMr: string } {
  const stateEn = normalizeStateName(state) || DEFAULT_STATE;
  return { stateEn, stateMr: getStateLabel(stateEn, 'mr') };
}

/** Canonical English + Marathi pair for a selected city. */
export function localizedCityParts(city: string): { cityEn: string; cityMr: string } {
  const cityEn = normalizeCityName(city) || DEFAULT_CITY;
  return { cityEn, cityMr: getCityLabel(cityEn, 'mr') };
}

export function defaultLocationParts(): {
  stateEn: string;
  stateMr: string;
  cityEn: string;
  cityMr: string;
} {
  return {
    ...localizedStateParts(DEFAULT_STATE),
    ...localizedCityParts(DEFAULT_CITY),
  };
}
