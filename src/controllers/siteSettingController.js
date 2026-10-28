import SiteSetting from '../models/SiteSetting.js';
import ApiError from '../utils/ApiError.js';
import { isEmail } from '../utils/validators.js';

/** Site-wide contact details (Web → Contact Info), reused by every page that shows a phone, email or website. */

const CONTACT_KEY = 'contact';
const PHONE_PATTERN = /^\d{10}$/;
const WEBSITE_PATTERN = /^https?:\/\/[^\s]+$/i;

const EMPTY_CONTACT = { phone: '', whatsappMessage: '', email: '', website: '' };

const toContactFields = (doc) => {
  const { phone, whatsappMessage, email, website } = { ...EMPTY_CONTACT, ...doc };

  return { phone, whatsappMessage, email, website };
};

/** "8544078245" → "+91 85440 78245" */
const formatPhone = (phone) => `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

/** The website's contact shape: { phoneDisplay, tel, whatsappUrl, email, website: { label, href } } */
const toPublicContact = ({ phone, whatsappMessage, email, website }) => {
  const message = whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : '';

  return {
    phoneDisplay: phone ? formatPhone(phone) : '',
    tel: phone ? `tel:+91${phone}` : '',
    whatsappUrl: phone ? `https://wa.me/91${phone}${message}` : '',
    email,
    website: { label: website.replace(/^https?:\/\//i, '').replace(/\/$/, ''), href: website },
  };
};

const findContact = () => SiteSetting.findOne({ key: CONTACT_KEY }).lean();

/* ---------- public (website) ---------- */

/** GET /api/site-config — { contact } (404 until the contact details are saved) */
export const getSiteConfig = async (_req, res) => {
  const contact = await findContact();

  if (!contact) throw new ApiError(404, 'Contact details are not set.');

  res.json({ contact: toPublicContact(toContactFields(contact)) });
};

/* ---------- admin ---------- */

/** GET /api/admin/contact — { phone, whatsappMessage, email, website } */
export const getContact = async (_req, res) => {
  res.json(toContactFields(await findContact()));
};

/** PUT /api/admin/contact { phone, whatsappMessage, email, website } */
export const updateContact = async (req, res) => {
  const { phone = '', whatsappMessage = '', email = '', website = '' } = req.body || {};
  const digits = String(phone)
    .replace(/\D/g, '')
    .replace(/^91(?=\d{10}$)/, '');

  if (!PHONE_PATTERN.test(digits))
    throw new ApiError(400, 'Phone must be a 10-digit mobile number.');

  if (!isEmail(email)) throw new ApiError(400, 'Enter a valid email address.');

  if (!WEBSITE_PATTERN.test(String(website).trim()))
    throw new ApiError(400, 'Website must start with https://');

  const contact = await SiteSetting.findOneAndUpdate(
    { key: CONTACT_KEY },
    {
      phone: digits,
      whatsappMessage: String(whatsappMessage).trim(),
      email: email.trim().toLowerCase(),
      website: String(website).trim(),
    },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  res.json(toContactFields(contact));
};
