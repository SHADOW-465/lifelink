import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';

// Define a schema for input validation using Zod
const userSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  role: z.nativeEnum(Role),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  bloodType: z.string(), // Assuming bloodType is provided as a string, will be validated against the enum
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().min(1, { message: 'Address is required' }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = userSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password, role, ...profileData } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Use a transaction to ensure atomicity
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
        },
      });

      if (role === Role.DONOR) {
        await tx.donorProfile.create({
          data: {
            userId: newUser.id,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            bloodType: profileData.bloodType as any, // Cast because validation is done implicitly by Prisma
            latitude: profileData.latitude,
            longitude: profileData.longitude,
            address: profileData.address,
          },
        });
      } else if (role === Role.RECIPIENT) {
        await tx.recipientProfile.create({
          data: {
            userId: newUser.id,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            bloodType: profileData.bloodType as any,
            latitude: profileData.latitude,
            longitude: profileData.longitude,
            address: profileData.address,
          },
        });
      }

      return newUser;
    });

    // Omit password from the returned user object
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}