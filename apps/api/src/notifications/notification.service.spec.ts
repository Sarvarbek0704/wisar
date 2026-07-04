import { NotificationService } from "./notification.service";

function makePrismaMock() {
  return {
    notification: {
      create: jest.fn().mockResolvedValue({ id: "n1" }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(3),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as ConstructorParameters<typeof NotificationService>[0];
}

describe("NotificationService", () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: NotificationService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new NotificationService(prisma);
  });

  it("create — bitta bildirishnoma yozadi", async () => {
    await service.create({ userId: "u1", type: "system", title: "Salom" });
    expect((prisma as any).notification.create).toHaveBeenCalledWith({
      data: { userId: "u1", type: "system", title: "Salom" },
    });
  });

  it("create — xato bo'lsa yutadi (asosiy oqim buzilmaydi)", async () => {
    (prisma as any).notification.create.mockRejectedValueOnce(new Error("db down"));
    await expect(service.create({ userId: "u1", type: "system", title: "X" })).resolves.toBeUndefined();
  });

  it("createMany — bo'sh ro'yxatda hech narsa qilmaydi", async () => {
    await service.createMany([], { type: "content", title: "Yangi dars" });
    expect((prisma as any).notification.createMany).not.toHaveBeenCalled();
  });

  it("createMany — har userga bir yozuv tayyorlaydi", async () => {
    await service.createMany(["a", "b"], { type: "content", title: "Yangi dars" });
    expect((prisma as any).notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "a", type: "content", title: "Yangi dars" },
        { userId: "b", type: "content", title: "Yangi dars" },
      ],
    });
  });

  it("list — take 50 dan oshmaydi (cheklov)", async () => {
    await service.list("u1", { take: 999 });
    expect((prisma as any).notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, where: { userId: "u1" } }),
    );
  });

  it("list — unreadOnly read:false filtri qo'shadi", async () => {
    await service.list("u1", { unreadOnly: true });
    expect((prisma as any).notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", read: false } }),
    );
  });

  it("unreadCount — o'qilmaganlar sonini qaytaradi", async () => {
    await expect(service.unreadCount("u1")).resolves.toBe(3);
    expect((prisma as any).notification.count).toHaveBeenCalledWith({ where: { userId: "u1", read: false } });
  });

  it("markRead — faqat egasi (id+userId) bo'yicha yangilaydi", async () => {
    await service.markRead("n1", "u1");
    expect((prisma as any).notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "u1" },
      data: { read: true },
    });
  });

  it("markAllRead — barcha o'qilmaganlarni belgilaydi", async () => {
    await service.markAllRead("u1");
    expect((prisma as any).notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", read: false },
      data: { read: true },
    });
  });
});
