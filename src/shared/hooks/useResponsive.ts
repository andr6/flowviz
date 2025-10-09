import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoints {
  xs: boolean;    // 0-599px (mobile)
  sm: boolean;    // 600-899px (tablet)
  md: boolean;    // 900-1199px (small desktop)
  lg: boolean;    // 1200-1535px (desktop)
  xl: boolean;    // 1536px+ (large desktop)
}

export interface ResponsiveHelpers {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
}

export interface UseResponsiveReturn extends ResponsiveBreakpoints, ResponsiveHelpers {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
}

export const useResponsive = (): UseResponsiveReturn => {
  const muiTheme = useTheme();
  
  // Media queries for breakpoints
  const xs = useMediaQuery(muiTheme.breakpoints.only('xs'));
  const sm = useMediaQuery(muiTheme.breakpoints.only('sm'));
  const md = useMediaQuery(muiTheme.breakpoints.only('md'));
  const lg = useMediaQuery(muiTheme.breakpoints.only('lg'));
  const xl = useMediaQuery(muiTheme.breakpoints.only('xl'));
  
  // Helper queries
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const isLargeDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));
  
  // Screen dimensions and orientation
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );
  const [screenHeight, setScreenHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 1080
  );
  const [isTouch, setIsTouch] = useState(
    typeof window !== 'undefined' ? 'ontouchstart' in window : false
  );

  // Current breakpoint
  const breakpoint = xs ? 'xs' : sm ? 'sm' : md ? 'md' : lg ? 'lg' : 'xl';
  
  // Orientation
  const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';

  // Listen for resize events
  useEffect(() => {
    if (typeof window === 'undefined') {return;}

    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    const handleTouchCheck = () => {
      setIsTouch('ontouchstart' in window);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('touchstart', handleTouchCheck, { once: true });

    // Initial check
    handleResize();
    handleTouchCheck();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleTouchCheck);
    };
  }, []);

  return {
    // Breakpoints
    xs,
    sm,
    md,
    lg,
    xl,
    
    // Helpers
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isTouch,
    screenWidth,
    screenHeight,
    
    // Current state
    breakpoint,
    orientation,
  };
};