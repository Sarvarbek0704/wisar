import { validateEnv } from "./env";

describe("validateEnv", () => {
  const OLD = process.env;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...OLD };
    exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = OLD;
    jest.restoreAllMocks();
  });

  const STRONG = "a".repeat(40);

  it("prod + kuchli sirlar → to'xtatmaydi", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://x";
    process.env.JWT_SECRET = STRONG;
    validateEnv();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("prod + JWT_SECRET yo'q → process.exit(1) (fail-fast)", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://x";
    delete process.env.JWT_SECRET;
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("prod + zaif (qisqa) JWT_SECRET → process.exit(1)", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://x";
    process.env.JWT_SECRET = "qisqa";
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("prod + standart 'wisar-dev-secret' → process.exit(1)", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://x";
    process.env.JWT_SECRET = "wisar-dev-secret";
    validateEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("dev + yo'q sir → faqat ogohlantiradi (to'xtatmaydi)", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;
    validateEnv();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
