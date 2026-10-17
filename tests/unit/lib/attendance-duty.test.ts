import { punctualityStatus } from '@/lib/attendance/duty';

describe('punctualityStatus', () => {
  it('treats a punch at 10:30 AM IST as on time', () => {
    expect(punctualityStatus(new Date('2026-10-17T10:30:00+05:30'))).toBe('on_time');
  });

  it('treats a punch at 11:00 AM IST as on time', () => {
    expect(punctualityStatus(new Date('2026-10-17T11:00:00+05:30'))).toBe('on_time');
  });

  it('treats a punch after 11:00 AM IST as late', () => {
    expect(punctualityStatus(new Date('2026-10-17T11:01:00+05:30'))).toBe('late');
  });
});
