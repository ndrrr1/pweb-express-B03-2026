export function normalizeConnectionString(value) {
  const raw = String(value || "").trim();
  const urls = raw.match(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi);
  return urls?.length === 1 ? urls[0] : raw;
}

export function directFromPooled(value) {
  try {
    const url = new URL(normalizeConnectionString(value));
    if (
      !url.hostname.endsWith(".neon.tech") ||
      !url.hostname.includes("-pooler.")
    )
      return "";
    url.hostname = url.hostname.replace("-pooler.", ".");
    return url.href;
  } catch {
    return "";
  }
}

export function validateEnvironment(env) {
  const errors = [];
  const parsed = {};
  for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
    const raw = env[key]?.trim();
    if (!raw) {
      errors.push(
        `${key} belum diisi. Salin connection string lengkap dari Neon Console.`,
      );
      continue;
    }
    try {
      const url = new URL(raw);
      if (
        !["postgres:", "postgresql:"].includes(url.protocol) ||
        !url.hostname.endsWith(".neon.tech") ||
        !url.username ||
        !url.password ||
        url.pathname.length < 2 ||
        /[\r\n]/.test(raw)
      )
        throw new Error();
      const markers = [
        "password",
        "your_password",
        "nama",
        "username",
        "your_user",
        "neon_password",
      ];
      if (
        markers.includes(decodeURIComponent(url.password).toLowerCase()) ||
        /NAMA|YOUR-|EXAMPLE|<|>/i.test(url.hostname)
      )
        throw new Error();
      parsed[key] = url;
    } catch {
      errors.push(
        `${key} belum berupa koneksi Neon yang valid. Tempel URL lengkap, bukan contoh placeholder.`,
      );
    }
  }
  const pooled = parsed.DATABASE_URL;
  const direct = parsed.DATABASE_URL_UNPOOLED;
  if (pooled && !pooled.hostname.includes("-pooler."))
    errors.push("DATABASE_URL harus dari pilihan connection pooling ON.");
  if (direct?.hostname.includes("-pooler."))
    errors.push(
      "DATABASE_URL_UNPOOLED harus dari pilihan connection pooling OFF.",
    );
  if (
    pooled &&
    direct &&
    (pooled.hostname.replace("-pooler.", ".") !== direct.hostname ||
      pooled.pathname !== direct.pathname ||
      pooled.username !== direct.username)
  )
    errors.push(
      "Kedua koneksi harus mengarah ke branch, database, dan role Neon yang sama.",
    );
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    errors.push("PORT harus berupa angka 1–65535.");
  return errors;
}
