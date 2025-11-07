import { ErrorContextCapture } from '../../src/utils/error-context-capture';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'test-os',
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    ios: { buildNumber: '1' },
    android: { versionCode: 2 },
  },
}));

describe('ErrorContextCapture', () => {
  beforeEach(() => {
    ErrorContextCapture.clearHistory();
    ErrorContextCapture.setCurrentRoute(null);
  });

  it('should capture context correctly', () => {
    const error = new Error('test error');
    const errorInfo = { componentStack: '...stack...' };

    ErrorContextCapture.setCurrentRoute('/home');
    ErrorContextCapture.recordUserAction('click_button');

    const context = ErrorContextCapture.capture(error, errorInfo);

    expect(context.platform).toBe('test-os');
    expect(context.appVersion).toBe('1.0.0');
    expect(context.buildNumber).toBe('1');
    expect(context.componentStack).toBe('...stack...');
    expect(context.route).toBe('/home');
    expect(context.userActions).toHaveLength(1);
    expect(context.userActions[0]).toContain('click_button');
  });

  it('should record user actions and cap at MAX_HISTORY (10)', () => {
    for (let i = 0; i < 15; i++) {
      ErrorContextCapture.recordUserAction(`action_${i}`);
    }
    const actions = ErrorContextCapture.getRecentActions();
    expect(actions).toHaveLength(10);
    expect(actions[0]).toContain('action_5'); // First 5 are pushed out
    expect(actions[9]).toContain('action_14');
  });

  it('should clear history', () => {
    ErrorContextCapture.recordUserAction('action_1');
    expect(ErrorContextCapture.getRecentActions()).toHaveLength(1);
    ErrorContextCapture.clearHistory();
    expect(ErrorContextCapture.getRecentActions()).toHaveLength(0);
  });
});
