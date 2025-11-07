import { ErrorContextBuilder } from '../../src/utils/error-context-builder';
import { LogContext } from '../../src/domain/common/errors';

describe('ErrorContextBuilder', () => {
  it('should create context fromService', () => {
    const context = ErrorContextBuilder.fromService('TestService', 'doWork', 'user1', 'proj1', {
      a: 1,
    });
    expect(context).toEqual({
      component: 'TestService',
      method: 'doWork',
      userId: 'user1',
      projectId: 'proj1',
      metadata: { a: 1 },
    });
  });

  it('should create context fromRepository', () => {
    const context = ErrorContextBuilder.fromRepository('TestRepo', 'find', 'user1');
    expect(context).toEqual({
      component: 'TestRepo',
      method: 'find',
      userId: 'user1',
      projectId: undefined,
      metadata: undefined,
    });
  });

  it('should create context fromHook', () => {
    const context = ErrorContextBuilder.fromHook('useTest', 'update');
    expect(context).toEqual({
      component: 'useTest',
      method: 'update',
      userId: undefined,
      projectId: undefined,
      metadata: undefined,
    });
  });

  it('should create context fromComponent', () => {
    const context = ErrorContextBuilder.fromComponent('TestForm', 'submit');
    expect(context).toEqual({
      component: 'TestForm',
      method: 'submit',
      userId: undefined,
      projectId: undefined,
      metadata: undefined,
    });
  });

  it('should add userId with withUserId', () => {
    let context = ErrorContextBuilder.fromService('TestService', 'doWork');
    context = ErrorContextBuilder.withUserId(context, 'user123');
    expect(context.userId).toBe('user123');
  });

  it('should add projectId with withProjectId', () => {
    let context = ErrorContextBuilder.fromService('TestService', 'doWork');
    context = ErrorContextBuilder.withProjectId(context, 'proj123');
    expect(context.projectId).toBe('proj123');
    expect(context.metadata).toEqual({ projectId: 'proj123' });
  });

  it('should add metadata with withMetadata', () => {
    let context = ErrorContextBuilder.fromService('TestService', 'doWork', 'u1', 'p1', { a: 1 });
    context = ErrorContextBuilder.withMetadata(context, { b: 2 });
    expect(context.metadata).toEqual({ a: 1, b: 2 });
  });

  it('should convert to string', () => {
    const context = ErrorContextBuilder.fromService('TestService', 'doWork');
    expect(ErrorContextBuilder.toString(context)).toBe('TestService.doWork');
  });

  it('should create from string', () => {
    const context = ErrorContextBuilder.fromString('TestService.doWork');
    expect(context).toEqual({
      component: 'TestService',
      method: 'doWork',
      context: 'TestService.doWork',
    });
  });
});
