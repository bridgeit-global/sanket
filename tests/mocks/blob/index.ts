export type BlobMockCall = {
  operation: 'put' | 'delete';
  pathname: string;
};

export function createBlobTransportMock() {
  const calls: BlobMockCall[] = [];

  return {
    calls,
    async put(pathname: string) {
      calls.push({ operation: 'put', pathname });
      return { url: `https://blob.test/${encodeURIComponent(pathname)}` };
    },
    async delete(pathname: string) {
      calls.push({ operation: 'delete', pathname });
    },
  };
}
