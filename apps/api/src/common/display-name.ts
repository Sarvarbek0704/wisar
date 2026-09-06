/**
 * Foydalanuvchining ommaga ko'rinadigan nomi.
 *
 * Ilgari hamma joyda `user.name || user.email.split("@")[0]` yozilgan edi.
 * Endi email ixtiyoriy (telefon bilan ro'yxatdan o'tish mumkin), shuning uchun
 * bu mantiq bitta joyga yig'ildi.
 *
 * MUHIM: telefon raqami ommaga HECH QACHON ko'rsatilmaydi — u shaxsiy ma'lumot.
 * Ismi ham, emaili ham yo'q foydalanuvchi oddiy "Foydalanuvchi" bo'lib ko'rinadi.
 */
export function displayName(u: {
  name?: string | null;
  email?: string | null;
}): string {
  const name = u.name?.trim();
  if (name) return name;
  if (u.email) return u.email.split("@")[0];
  return "Foydalanuvchi";
}
