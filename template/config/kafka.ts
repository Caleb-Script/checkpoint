import { config } from './app.js';

const { kafka } = config;

export const kafkaBroker = `${kafka.host}:9092`;
export const groupId = kafka.groupId;
console.log('kafka Host is %s', kafkaBroker);

//import { ClientsModule, Transport } from '@nestjs/microservices';

// export const KafkaConfig = ClientsModule.register([
//     {
//         name: 'KAFKA_SERVICE',
//         transport: Transport.KAFKA,
//         options: {
//             client: {
//                 brokers: ['localhost:9092'],
//             },
//             consumer: {
//                 groupId: 'profile-consumer',
//             },
//         },
//     },
// ]);
