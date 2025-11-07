// __tests__/hooks/use-project.spec.ts

import { renderHook, act } from '@testing-library/react-native';
import { useProject } from '@/hooks/use-project';
import { BaseProjectService } from '@/services/base-project-service';
import { BaseProject, defaultBaseProject } from '@/domain/project/project.schema';
import { ok, err } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';

// Mock the service
jest.mock('@/services/base-project-service');
const MockProjectService = BaseProjectService as jest.MockedClass<typeof BaseProjectService>;

const mockGetProject = jest.fn();
const mockUpdateProject = jest.fn();

const mockServiceInstance = {
  getProject: mockGetProject,
  updateProject: mockUpdateProject,
} as any;

describe('useProject', () => {
  const projectId = 'test-project-id';
  const mockProject: BaseProject = {
    ...defaultBaseProject(projectId, 'user-123', 'Photog'),
    projectName: 'Test Project',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockProjectService.mockImplementation(() => mockServiceInstance);
  });

  it('should auto-fetch project on mount', async () => {
    mockGetProject.mockResolvedValue(ok(mockProject));

    const { result } = renderHook(() =>
      useProject(projectId, mockServiceInstance, { autoFetch: true }),
    );

    expect(result.current.loading).toBe(true);

    expect(mockGetProject).toHaveBeenCalledWith(projectId);
    expect(result.current.project).toEqual(mockProject);
    expect(result.current.loading).toBe(false);
  });

  it('should set error state if fetch fails', async () => {
    const testError = new FirestoreError(ErrorCode.DB_READ_ERROR, 'Fetch failed', 'Fetch failed');
    mockGetProject.mockResolvedValue(err(testError));

    const { result } = renderHook(() =>
      useProject(projectId, mockServiceInstance, { autoFetch: true }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.project).toBeNull();
    expect(result.current.error).toEqual(testError);
  });
});
