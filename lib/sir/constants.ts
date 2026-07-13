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

/** Source-module tag written to PhoneUpdateHistory for SIR-originated edits. */
export const SIR_SOURCE_MODULE = 'sir';
