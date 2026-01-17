/**
 * OAuth Complete Handler
 * Creates/updates user account after OAuth authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { findMotherByEmail, findDoctorByEmail, saveMother, saveDoctor, generateUniqueReferenceNumber } from '@/lib/data';
import { signAuthToken } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { email, name, role, supabaseUserId } = await req.json();

    if (!email || !role || (role !== 'mother' && role !== 'doctor')) {
      return NextResponse.json(
        { error: 'Invalid request. Email and role are required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let token: string;
    let redirectPath: string;
    let message: string | null = null;

    if (role === 'mother') {
      // Check if mother already exists
      let mother = await findMotherByEmail(email);

      if (!mother) {
        // Create new mother account
        mother = {
          id: uuid(),
          email: email,
          name: name || '',
          passwordHash: '', // OAuth users don't have password
          createdAt: now,
          updatedAt: now,
          status: 'active' as const,
          onboardingComplete: false, // New users need onboarding
        };
        await saveMother(mother);
        console.log(`[OAuth] Created new mother account: ${mother.id}, email: ${mother.email}`);
      } else {
        // Update existing mother (in case they're linking Google account)
        if (!mother.name && name) {
          mother.name = name;
          mother.updatedAt = now;
          await saveMother(mother);
        }
      }

      // Check if account is paused
      if (mother.status === 'paused') {
        return NextResponse.json(
          { error: 'Your account has been paused by admin. Please contact admin for more information.' },
          { status: 403 }
        );
      }

      token = signAuthToken({ id: mother.id, email: mother.email, role: 'mother' });
      // Check if onboarding is needed (new user or incomplete)
      const needsOnboarding = !mother.onboardingComplete && !mother.ageRange;
      
      return NextResponse.json({
        token,
        redirectPath: needsOnboarding ? '/mother/onboarding' : '/mother/dashboard',
        requiresOnboarding: needsOnboarding,
        message,
      });
    } else {
      // Doctor registration/login
      let doctor = await findDoctorByEmail(email);

      if (!doctor) {
        // Generate unique 8-digit reference number for new doctors
        const referenceNumber = await generateUniqueReferenceNumber();
        
        // Auto-register doctor with Google profile data
        doctor = {
          id: uuid(),
          email: email,
          name: name || '',
          phone: '', // Will need to be filled later
          role: 'doctor' as const,
          referenceNumber: referenceNumber,
          passwordHash: '', // OAuth users don't have password
          status: 'pending' as const, // Requires admin approval
          pendingVerification: false,
          createdAt: now,
          updatedAt: now,
        };
        await saveDoctor(doctor);
        console.log(`[OAuth] Created new doctor account (pending approval): ${doctor.id}, email: ${doctor.email}, reference: ${referenceNumber}`);
        
        return NextResponse.json({
          error: 'Account created successfully. Please wait for admin approval before logging in.',
          status: 'pending',
          requiresApproval: true,
        }, { status: 403 });
      }

      // Check doctor status
      if (doctor.status === 'paused') {
        return NextResponse.json(
          { error: 'Your account has been paused by admin. Please contact admin for more information.' },
          { status: 403 }
        );
      }

      if (doctor.status === 'pending') {
        return NextResponse.json(
          { error: 'Your account is pending admin approval. Please wait for approval before logging in.' },
          { status: 403 }
        );
      }

      if (doctor.status === 'rejected') {
        return NextResponse.json(
          { error: `Your account has been rejected. ${doctor.verificationComment ? `Reason: ${doctor.verificationComment}` : ''}` },
          { status: 403 }
        );
      }

      if (doctor.status !== 'approved') {
        return NextResponse.json(
          { error: 'Your account is not approved. Please contact admin.' },
          { status: 403 }
        );
      }

      // Only allow doctors to login - health workers (others) are not supported
      if (doctor.role !== 'doctor') {
        return NextResponse.json(
          { error: 'Only doctors can access this login. Health workers are not supported.' },
          { status: 403 }
        );
      }

      token = signAuthToken({ id: doctor.id, email: doctor.email, role: 'doctor' });
      redirectPath = '/doctor/dashboard';
    }

    return NextResponse.json({
      token,
      redirectPath,
      requiresOnboarding: false,
      message,
    });
  } catch (err: any) {
    console.error('[OAuth Complete] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to complete authentication' },
      { status: 500 }
    );
  }
}
