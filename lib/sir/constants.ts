/**
 * SIR (Special Intensive Revision) module configuration.
 *
 * Part Number / Part Serial Number are resolved from the `ElectionMapping`
 * table for this election id (booth_no = Part Number, sr_no = Part Serial
 * Number). State / District / Assembly Constituency are fixed for the
 * constituency this deployment serves.
 */
export const SIR_ELECTION_ID = process.env.SIR_ELECTION_ID || '172VS2024';

export const SIR_STATE = 'Maharashtra';
export const SIR_DISTRICT = 'Mumbai Suburban';
export const SIR_ASSEMBLY_CONSTITUENCY = 'Anushakti Nagar';

/** Honourable MLA credited on shared/downloaded SIR documents. */
export const SIR_MLA_NAME = 'Sana Malik Shaikh';

/** Assets embedded in the SIR profile document (public/ paths). */
/** NCP official election symbol (clock). */
export const SIR_CREDIT_LOGO = '/images/ncp_election_symbol.png';
/** MLA wordmark / signature logo (name in Marathi). */
export const SIR_MLA_WORDMARK = '/images/landing/logo.png';
/** MLA portrait shown on the branded document header. */
export const SIR_MLA_PHOTO = '/images/landing/about.webp';

/** Source-module tag written to PhoneUpdateHistory for SIR-originated edits. */
export const SIR_SOURCE_MODULE = 'sir';
