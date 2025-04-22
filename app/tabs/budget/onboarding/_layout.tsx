import { Slot, useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';


export const unstable_settings = {
    initialRouteName: 'BudgetOnboarding',
};

export const options = {
    href: null, // 👉 ascunde TOATE rutele din acest folder din tab bar
};

export default function OnboardingLayout() {
    const router = useRouter();
    const { mode = 'onboarding' } = useLocalSearchParams();

    // poți trimite "mode" mai departe ca prop în paginile de onboarding, sau folosești direct `useLocalSearchParams()` în ele

    return <Slot />;
}
