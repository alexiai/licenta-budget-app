import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import styles from './OverviewHeaderStyles';

export default function OverviewHeader({
    hideSwitch = false,
}: {
    hideSwitch?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const currentView = pathname.split('/').pop();

    const getViewPath = (view: string) => {
        switch (view) {
            case 'list':
                return '/tabs/overview/list';
            case 'chart':
                return '/tabs/overview/chart';
            case 'calendar':
                return '/tabs/overview/calendar';
            default:
                return '/tabs/overview/list';
        }
    };

    return (
        <View style={styles.headerContainer}>
            {!hideSwitch && (
                <View style={styles.switchRow}>
                    {['list', 'chart', 'calendar'].map(view => (
                        <TouchableOpacity
                            key={view}
                            style={[
                                styles.switchBtn,
                                currentView === view && styles.switchBtnActive
                            ]}
                            onPress={() => router.replace(getViewPath(view))}
                        >
                            <Text style={[
                                styles.switchText,
                                currentView === view && styles.switchTextActive
                            ]}>
                                {view.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}
