import type { IUser } from "../types/interfaces"

export const stripUserPassword = (user: IUser): IUser => {
  const copy = { ...user } as Partial<IUser> & { password?: string }
  delete copy.password
  return copy as IUser
}
