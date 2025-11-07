/*---------------------------------------
File: src/domain/types/assets.d.ts
Description: Asset type declarations for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}
declare module '*.jpg' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}
declare module '*.jpeg' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}
declare module '*.webp' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

// For SVG assets handled by react-native-svg-transformer
declare module '*.svg' {
  import type { SvgProps } from 'react-native-svg';
  import type React from 'react';
  const content: React.FC<SvgProps>;
  export default content;
}
