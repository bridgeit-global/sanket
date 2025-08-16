import { tool } from 'ai';
import { z } from 'zod';
import { getAllServices } from '@/lib/db/queries';

export const getServicesTool = () => tool({
    description: 'Get all available services for beneficiary management. Services can be one-to-one (individual voter services) or one-to-many (public works affecting multiple voters).',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const services = await getAllServices();

            // Group services by type for better organization
            const oneToOneServices = services.filter(service => service.type === 'one-to-one');
            const oneToManyServices = services.filter(service => service.type === 'one-to-many');

            return {
                totalServices: services.length,
                oneToOneServices: oneToOneServices.map(service => ({
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    category: service.category,
                })),
                oneToManyServices: oneToManyServices.map(service => ({
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    category: service.category,
                })),
                summary: `Available services: ${services.length} total (${oneToOneServices.length} one-to-one, ${oneToManyServices.length} one-to-many). One-to-one services include individual voter services like voter registration, Aadhar card, ration card, and schemes. One-to-many services include public works like fund utilization and issue visibility.`,
            };
        } catch (error) {
            console.error('Error in getServicesTool:', error);
            throw new Error('Failed to get services');
        }
    },
}); 