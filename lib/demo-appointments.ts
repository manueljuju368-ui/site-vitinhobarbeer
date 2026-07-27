export type DemoAppointment={barber:string;service:string;date:string;time:string;name:string;phone:string};
declare global{
  // `var` is required for a shared global declaration across Next.js reloads.
  var vitinhoDemoAppointments:DemoAppointment[]|undefined
}
export const demoAppointments=globalThis.vitinhoDemoAppointments??=[];
globalThis.vitinhoDemoAppointments=demoAppointments;
