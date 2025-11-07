/*---------------------------------------
File: src/domain/types/theme.d.ts
Description: Theme type declarations for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import 'react-native-paper';

declare module 'react-native-paper' {
  interface MD3Colors {
    overlay: string;
    success?: string; // Optional: add other custom colors here too
  }
}
