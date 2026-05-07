#include <bits/stdc++.h>
using namespace std;

struct random{
    int a[2];
    float pi;
    int d;
};

int main()
{
    random r;
    r.pi = 3.14;
    r.a[0] = r.pi;
    r.d = 7;
    for(int i=0;i<r.d;i++) cout << r.a[i] << endl;
    return 0;
}