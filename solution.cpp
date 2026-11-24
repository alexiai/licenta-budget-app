#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    vector<long long> a(n + 1);  // Using long long to handle large numbers
    
    // Read input array
    for(int i = 1; i <= n; i++) {
        cin >> a[i];
    }
    
    // For each possible first position
    for(int x = 1; x <= n-3; x++) {
        // For each possible second position
        for(int y = x+1; y <= n-2; y++) {
            // Create a hash map to store values and their positions
            unordered_map<long long, int> valueToPos;
            
            // For each possible third position
            for(int z = y+1; z <= n-1; z++) {
                // Calculate the value we need to find
                long long target = -(a[x] + a[y] + a[z]);
                
                // Check if we've seen this value before
                if(valueToPos.find(target) != valueToPos.end()) {
                    int t = valueToPos[target];
                    if(t > z) {  // Ensure t is after z
                        cout << x << " " << y << " " << z << " " << t << endl;
                        return 0;
                    }
                }
                
                // Store current value and its position
                valueToPos[a[z]] = z;
            }
        }
    }
    
    // If no solution found
    cout << -1 << endl;
    return 0;
} 