// __tests__/services/base-project-service.spec.ts

import { BaseProjectService } from '@/services/base-project-service';
import { IBaseProjectRepository } from '@/repositories/i-base-project-repository';
import { BaseProject, BaseProjectInput, defaultBaseProject } from '@/domain/project/project.schema';
import { ProjectStatus } from '@/constants/enums';
import { Result, ok, err } from '@/domain/common/result';
import { ErrorMapper } from '@/utils/error-mapper';

const mockProjectRepository: jest.Mocked<IBaseProjectRepository> = {
  create: jest.fn(),
  getById: jest.fn(),
  listByUserId: jest.fn(),
  subscribeToUserProjects: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('BaseProjectService', () => {
  let projectService: BaseProjectService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Create a new instance of the service with the mock repository
    projectService = new BaseProjectService(mockProjectRepository);
  });

  describe('create', () => {
    it('should successfully create a project by calling the repository', async () => {
      const projectInput: BaseProjectInput = {
        projectName: 'Test Project',
        eventDate: new Date(),
        personAName: { firstName: 'John', lastName: 'Doe' },
        personBName: { firstName: 'Jane', lastName: 'Smith' },
        email: 'john@example.com',
        phone: '+1234567890',
      };

      const expectedProject = {
        id: 'test-project-id',
        ...projectInput,
        userId: 'user-123',
        photographerName: 'Photographer Name',
        projectStatus: ProjectStatus.SETUP,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as BaseProject;

      // 3. Mock the repository's response
      mockProjectRepository.create.mockResolvedValue(ok(expectedProject));

      // 4. Call the service
      const result = await projectService.create(
        '36b8f84d-df4e-4d49-b662-bcde71a8764f',
        projectInput,
        undefined,
      );

      // 5. Assert the results
      expect(mockProjectRepository.create).toHaveBeenCalledWith(
        '36b8f84d-df4e-4d49-b662-bcde71a8764f',
        projectInput,
        undefined,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(expectedProject);
      }
    });

    it('should return a validation error for invalid input without calling the repository', async () => {
      const invalidInput = { projectName: '' }; // Invalid

      const result = await projectService.create(
        '36b8f84d-df4e-4d49-b662-bcde71a8764f',
        invalidInput as any,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VAL_001');
      }
      expect(mockProjectRepository.create).not.toHaveBeenCalled();
    });

    it('should return an error if the repository fails', async () => {
      const projectInput: BaseProjectInput = {
        projectName: 'Test Project',
        eventDate: new Date(),
        personAName: { firstName: 'John', lastName: 'Doe' },
        personBName: { firstName: 'Jane', lastName: 'Smith' },
        email: 'john@example.com',
        phone: '+1234567890',
      };
      const dbError = ErrorMapper.fromFirestore(new Error('permission-denied'), 'create');

      mockProjectRepository.create.mockResolvedValue(err(dbError));

      const result = await projectService.create('user1', projectInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(dbError);
      }
    });
  });
});

//   beforeEach(() => {
//     jest.clearAllMocks();
//     service = new BaseProjectService(mockRepository);
//   });

//   describe('getById', () => {
//     it('should return a project from the repository', async () => {
//       mockRepository.getById.mockResolvedValue(ok(mockProject));

//       const result = await service.getById(projectId);

//       expect(mockRepository.getById).toHaveBeenCalledWith(projectId);
//       expect(result).toEqual(ok(mockProject));
//     });
//   });

//   describe('update', () => {
//     it('should call update on the repository', async () => {
//       const updates = { projectName: 'New Name' };
//       mockRepository.update.mockResolvedValue(ok(undefined));

//       const result = await service.update(projectId, updates);

//       expect(mockRepository.update).toHaveBeenCalledWith(projectId, updates);
//       expect(result).toEqual(ok(undefined));
//     });
//   });
// });
