import { Redirect } from 'expo-router';

export default function Index() {
    // Always redirect to welcome page first
    return <Redirect href="/welcome" />;
}
