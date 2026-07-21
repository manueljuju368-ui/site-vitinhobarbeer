export type DemoAppointment={barber:string;service:string;date:string;time:string;name:string;phone:string};
declare global{var vitinhoDemoAppointments:DemoAppointment[]|undefined}
export const demoAppointments=globalThis.vitinhoDemoAppointments??=[];
globalThis.vitinhoDemoAppointments=demoAppointments;
