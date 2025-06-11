import { Redirect } from 'expo-router';

export default function OverviewIndex() {
    // Redirect to list view by default
    return <Redirect href="/tabs/overview/list" />;
} 