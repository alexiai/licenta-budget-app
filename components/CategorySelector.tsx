import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import categories from '../lib/categories';
import styles from './CategorySelectorStyles';

interface CategorySelectorProps {
    onSelectCategory: (category: string) => void;
    onSelectSubcategory: (subcategory: string) => void;
}

export default function CategorySelector({
    onSelectCategory,
    onSelectSubcategory,
}: CategorySelectorProps) {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showSubcategories, setShowSubcategories] = useState(false);

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        onSelectCategory(category);
        setShowSubcategories(true);
    };

    const handleSubcategorySelect = (subcategory: string) => {
        onSelectSubcategory(subcategory);
        setShowSubcategories(false);
    };

    const selectedCategoryData = categories.find(cat => cat.label === selectedCategory);

    return (
        <View style={styles.formGroup}>
            {!showSubcategories ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {categories.map((cat, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.categoryButton,
                                selectedCategory === cat.label && styles.categoryButtonSelected
                            ]}
                            onPress={() => handleCategorySelect(cat.label)}
                        >
                            <Text style={[
                                styles.categoryButtonText,
                                selectedCategory === cat.label && styles.categoryButtonTextSelected
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            ) : (
                <View>
                    <TouchableOpacity
                        style={styles.backToCategories}
                        onPress={() => setShowSubcategories(false)}
                    >
                        <Ionicons name="arrow-back" size={20} color="#91483c" />
                        <Text style={styles.backToCategoriesText}>Back to Categories</Text>
                    </TouchableOpacity>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {selectedCategoryData?.subcategories.map((sub, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.categoryButton}
                                onPress={() => handleSubcategorySelect(sub)}
                            >
                                <Text style={styles.categoryButtonText}>{sub}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
} 