import { describe, expect, it } from 'vitest';
import {
  createTestProject,
  createTestUser,
  createTestVoter,
  createTestVisitor,
} from '@/tests/fixtures/factories';
import { createBlobTransportMock } from '@/tests/mocks/blob';
import { createPrintTransportMock } from '@/tests/mocks/print';
import { createWebPushTransportMock } from '@/tests/mocks/push';
import { createWhatsAppSenderMock } from '@/tests/mocks/whatsapp';

describe('test factories and external transport mocks', () => {
  // TEST-INFRA-FACTORY-001
  it('creates synthetic future-domain fixtures without real personal data', () => {
    expect(createTestUser().email).toMatch(/@example\.test$/);
    expect(createTestVoter().epicNumber).toMatch(/^TST/);
    expect(createTestVisitor().mobile).toBe('9000000000');
    expect(createTestProject().status).toBe('WNS');
  });

  // TEST-INFRA-MOCK-001
  it('captures external side effects without network, push, or print access', async () => {
    const blob = createBlobTransportMock();
    const push = createWebPushTransportMock();
    const whatsapp = createWhatsAppSenderMock();
    const print = createPrintTransportMock();

    await blob.put('synthetic.txt');
    await push.sendNotification({ endpoint: 'https://push.test' }, '{}');
    await whatsapp.send('9000000000', 'synthetic message');
    await print.print('synthetic-document');

    expect(blob.calls).toHaveLength(1);
    expect(push.calls).toHaveLength(1);
    expect(whatsapp.calls).toHaveLength(1);
    expect(print.calls).toHaveLength(1);
  });
});
