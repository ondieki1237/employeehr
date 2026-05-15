import type { ICompany, IUser } from "../types/interfaces"

const safeString = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value))

export const toLegacyCompany = (company: any): ICompany => ({
  _id: company.id,
  name: company.name,
  slug: company.slug,
  email: company.email,
  phone: company.phone || "",
  website: company.website || undefined,
  industry: company.industry,
  employeeCount: company.employeeCount,
  logo: company.logo || undefined,
  country: company.country || undefined,
  state: company.state || undefined,
  city: company.city || undefined,
  countryCode: company.countryCode || undefined,
  primaryColor: company.primaryColor || undefined,
  secondaryColor: company.secondaryColor || undefined,
  accentColor: company.accentColor || undefined,
  backgroundColor: company.backgroundColor || undefined,
  textColor: company.textColor || undefined,
  borderRadius: company.borderRadius || undefined,
  fontFamily: company.fontFamily || undefined,
  buttonStyle: company.buttonStyle || undefined,
  subscription: company.subscription,
  emailConfig: company.emailConfig || undefined,
  dispatchSmsSettings: company.dispatchSmsSettings || undefined,
  invoiceSettings: company.invoiceSettings || undefined,
  setupProgress: company.setupProgress || undefined,
  pageAccessSettings: company.pageAccessSettings || undefined,
  enabledPages: Array.isArray(company.enabledPages) ? company.enabledPages : undefined,
  isFrozen: Boolean(company.isFrozen),
  frozenReason: company.frozenReason || undefined,
  frozenAt: company.frozenAt || null,
  frozenBy: company.frozenBy || null,
  status: company.status,
  createdAt: company.createdAt || undefined,
  updatedAt: company.updatedAt || undefined,
})

export const toLegacyUser = (user: any): IUser => ({
  _id: user.id,
  org_id: user.orgId,
  employee_id: user.employeeId || undefined,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  password: user.password,
  role: user.role,
  department: user.department || undefined,
  position: user.position || undefined,
  manager_id: user.managerId || undefined,
  avatar: user.avatar || undefined,
  signatureUrl: user.signatureUrl || undefined,
  phone: user.phone || undefined,
  dateOfJoining: user.dateOfJoining || undefined,
  status: user.status,
  salary: user.salary || undefined,
  bankDetails: user.bankDetails || undefined,
  createdAt: user.createdAt || undefined,
  updatedAt: user.updatedAt || undefined,
})

export const splitName = (fullName: string) => {
  const trimmed = safeString(fullName).trim()
  const [firstName, ...rest] = trimmed.split(/\s+/)
  return {
    firstName: firstName || "Admin",
    lastName: rest.length > 0 ? rest.join(" ") : "Admin",
  }
}
