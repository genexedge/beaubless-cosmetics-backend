import bcrypt from "bcrypt";

// Hash password function
export const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.log(error);
  }
};

// Compare password function
export const comparePassword = (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};
