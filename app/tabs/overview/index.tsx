/*import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';

export default function OverviewRedirect() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const isRootOverview = pathname === '/tabs/overview' || pathname === '/tabs/overview/';
        console.log('📍 [overview/index] pathname:', pathname);

        if (isRootOverview) {
            console.log('📦 Redirecting to /tabs/overview/list...');
            router.replace('/tabs/overview/list');
        }
    }, [pathname]);


    return null;
}
*/