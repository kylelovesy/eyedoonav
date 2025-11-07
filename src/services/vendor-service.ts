/*---------------------------------------
File: src/services/vendor-service.ts
Description: Vendor service wrapping ListService, preserving subscription checks
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/

import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { VendorList, VendorItem } from '@/domain/scoped/vendor.schema';
import { vendorListSchema } from '@/domain/scoped/vendor.schema';
import { ZodSchema } from 'zod';
/**
 * Service for managing vendor lists
 * Wraps the generic ListService with Vendor-specific types
 */
export class VendorListService extends ListService<VendorList, VendorItem> {
  constructor(repository: IListRepository<VendorList, VendorItem>) {
    super(repository, vendorListSchema as ZodSchema<VendorList>, 'VendorListService');
  }
}

// /*---------------------------------------
// File: src/services/vendor-service.ts
// Description: Vendor service wrapping ListService, preserving subscription checks
// Author: Kyle Lovesy
// Date: 28/10-2025
// Version: 2.0.0
// ---------------------------------------*/

// import { Result, err, ok } from '@/domain/common/result';
// import { AppError } from '@/domain/common/errors';
// import {
//   VendorList,
//   VendorItem,
//   VendorItemInput,
//   VendorConfig,
//   vendorItemSchema,
//   vendorItemInputSchema,
//   defaultVendorItem,
//   vendorListSchema,
// } from '@/domain/scoped/vendor.schema';
// import { ErrorContextBuilder } from '@/utils/error-context-builder';
// import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
// // import { IVendorRepository } from '@/repositories/i-vendor-repository';
// import { IListRepository } from '@/repositories/i-list-repository';
// import { VendorList, VendorItem } from '@/domain/scoped/vendor.schema';
// import { vendorRepository } from '@/repositories/firestore/list.repository';
// import { ListService } from './list-service';
// import { generateId } from '@/utils/id-generator';
// import { SubscriptionPlan } from '@/constants/enums';
// import { ErrorMapper } from '@/utils/error-mapper';
// import { ErrorCode } from '@/constants/error-code-registry';
// import { getVendorLimits, canAddVendor, canUseGlobalVendors } from '@/constants/subscriptions';

// /**
//  * Vendor service
//  * Wraps ListService for generic operations and preserves Vendor-specific functionality
//  */
// export class VendorService implements IVendorService {
//   private readonly context = 'VendorService';
//   private readonly listService: ListService<VendorList, VendorItem>;

//   constructor(private repository: IVendorRepository & IListRepository<VendorList, VendorItem>) {
//     // Repository implements both IVendorRepository and IListRepository
//     this.listService = new ListService<VendorList, VendorItem>(
//       repository,
//       vendorListSchema,
//       this.context,
//     );
//   }

//   // ============================================================================
//   // USER SCOPE OPERATIONS
//   // ============================================================================

//   async getUserVendors(userId: string): Promise<Result<VendorList, AppError>> {
//     return this.listService.getUserList(userId);
//   }

//   async createInitialUser(userId: string): Promise<Result<void, AppError>> {
//     return this.repository.createInitialUser(userId);
//   }

//   async addUserVendor(
//     userId: string,
//     input: VendorItemInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<VendorItem, AppError>> {
//     const context = ErrorContextBuilder.fromService(this.context, 'addUserVendor', userId);
//     const contextString = ErrorContextBuilder.toString(context);

//     // 1. Check subscription limits
//     const limits = getVendorLimits(subscriptionPlan);

//     if (!limits.enabled) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.SUBSCRIPTION_FEATURE_UNAVAILABLE,
//           'Vendor feature not enabled for this subscription',
//           'Vendors are not available for your subscription plan. Please upgrade to use vendors.',
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 2. Check if global vendors are allowed
//     if (input.isGlobal && !canUseGlobalVendors(subscriptionPlan)) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.SUBSCRIPTION_FEATURE_UNAVAILABLE,
//           'Global vendors not enabled for this subscription',
//           'Global vendors are not available for your subscription plan. Please upgrade to use global vendors.',
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 3. Get current list to check count
//     const listResult = await this.listService.getUserList(userId);
//     if (!listResult.success && listResult.error.code !== ErrorCode.DB_NOT_FOUND) {
//       return listResult as Result<VendorItem, AppError>;
//     }

//     const currentCount = listResult.success ? listResult.value.items.length : 0;

//     // 4. Check vendor count limit
//     if (!canAddVendor(subscriptionPlan, currentCount)) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           `Vendor limit exceeded: Maximum ${limits.maxVendors} vendor(s) allowed`,
//           `Cannot add vendor. Maximum ${limits.maxVendors} vendor(s) allowed. Please upgrade your plan for more vendors.`,
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 5. Prepare input with isGlobal flag (user-level vendors are global by default)
//     const inputWithScope = { ...input, isGlobal: input.isGlobal ?? true };

//     // 6. Validate input
//     const validation = validateWithSchema(vendorItemInputSchema, inputWithScope, contextString);
//     if (!validation.success) {
//       return validation as Result<VendorItem, AppError>;
//     }

//     // 7. Create complete item with generated ID using default factory
//     const itemDefaults = defaultVendorItem(validation.value as VendorItemInput, {
//       userId,
//       createdBy: validation.value.createdBy,
//     });
//     const newItem = {
//       ...itemDefaults,
//       id: generateId(),
//     } as VendorItem;

//     // 8. Validate complete item
//     const itemValidation = validateWithSchema(vendorItemSchema, newItem, contextString);
//     if (!itemValidation.success) {
//       return itemValidation as Result<VendorItem, AppError>;
//     }

//     // 9. Add to repository via list service
//     const addResult = await this.listService.addUserItem(
//       userId,
//       itemValidation.value as VendorItem,
//     );
//     if (!addResult.success) {
//       return addResult as Result<VendorItem, AppError>;
//     }

//     return ok(itemValidation.value as VendorItem);
//   }

//   async updateUserVendor(userId: string, item: VendorItem): Promise<Result<void, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'updateUserVendor',
//       userId,
//       undefined,
//       { itemId: item.id },
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // Validate item
//     const validation = validateWithSchema(vendorItemSchema, item, contextString);
//     if (!validation.success) {
//       return err(validation.error);
//     }

//     return this.listService.batchUpdateUserItems(userId, [validation.value as VendorItem]);
//   }

//   async deleteUserVendor(userId: string, vendorId: string): Promise<Result<void, AppError>> {
//     return this.listService.deleteUserItem(userId, vendorId);
//   }

//   async updateUserConfig(
//     userId: string,
//     updates: Partial<VendorConfig>,
//   ): Promise<Result<void, AppError>> {
//     return this.repository.updateUserConfig(userId, updates);
//   }

//   // ============================================================================
//   // PROJECT SCOPE OPERATIONS
//   // ============================================================================

//   async getProjectVendors(
//     userId: string,
//     projectId: string,
//   ): Promise<Result<VendorList, AppError>> {
//     // Note: userId parameter is not used but kept for interface compatibility
//     return this.listService.getProjectList(projectId);
//   }

//   async createInitialProject(userId: string, projectId: string): Promise<Result<void, AppError>> {
//     return this.repository.createInitialProject(userId, projectId);
//   }

//   async addProjectVendor(
//     userId: string,
//     projectId: string,
//     input: VendorItemInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<VendorItem, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'addProjectVendor',
//       userId,
//       projectId,
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // 1. Check subscription limits
//     const limits = getVendorLimits(subscriptionPlan);

//     if (!limits.enabled) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.SUBSCRIPTION_FEATURE_UNAVAILABLE,
//           'Vendor feature not enabled for this subscription',
//           'Vendors are not available for your subscription plan. Please upgrade to use vendors.',
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 2. Get current list to check count
//     const listResult = await this.listService.getProjectList(projectId);
//     if (!listResult.success && listResult.error.code !== ErrorCode.DB_NOT_FOUND) {
//       return listResult as Result<VendorItem, AppError>;
//     }

//     const currentCount = listResult.success ? listResult.value.items.length : 0;

//     // 3. Check vendor count limit
//     if (!canAddVendor(subscriptionPlan, currentCount)) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           `Vendor limit exceeded: Maximum ${limits.maxVendors} vendor(s) allowed`,
//           `Cannot add vendor. Maximum ${limits.maxVendors} vendor(s) allowed. Please upgrade your plan for more vendors.`,
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 4. Prepare input with isGlobal flag (project-level vendors are not global)
//     const inputWithScope = { ...input, isGlobal: false };

//     // 5. Validate input
//     const validation = validateWithSchema(vendorItemInputSchema, inputWithScope, contextString);
//     if (!validation.success) {
//       return validation as Result<VendorItem, AppError>;
//     }

//     // 6. Create complete item with generated ID using default factory
//     const itemDefaults = defaultVendorItem(validation.value as VendorItemInput, {
//       userId,
//       createdBy: validation.value.createdBy,
//     });
//     const newItem = {
//       ...itemDefaults,
//       id: generateId(),
//     } as VendorItem;

//     // 7. Validate complete item
//     const itemValidation = validateWithSchema(vendorItemSchema, newItem, contextString);
//     if (!itemValidation.success) {
//       return itemValidation as Result<VendorItem, AppError>;
//     }

//     // 8. Add to repository via list service
//     const addResult = await this.listService.addProjectItem(
//       projectId,
//       itemValidation.value as VendorItem,
//     );
//     if (!addResult.success) {
//       return addResult as Result<VendorItem, AppError>;
//     }

//     return ok(itemValidation.value as VendorItem);
//   }

//   async updateProjectVendor(
//     userId: string,
//     projectId: string,
//     item: VendorItem,
//   ): Promise<Result<void, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'updateProjectVendor',
//       userId,
//       projectId,
//       { itemId: item.id },
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // Validate item
//     const validation = validateWithSchema(vendorItemSchema, item, contextString);
//     if (!validation.success) {
//       return err(validation.error);
//     }

//     return this.listService.batchUpdateProjectItems(projectId, [validation.value as VendorItem]);
//   }

//   async deleteProjectVendor(
//     userId: string,
//     projectId: string,
//     vendorId: string,
//   ): Promise<Result<void, AppError>> {
//     return this.listService.deleteProjectItem(projectId, vendorId);
//   }

//   async updateProjectConfig(
//     userId: string,
//     projectId: string,
//     updates: Partial<VendorConfig>,
//   ): Promise<Result<void, AppError>> {
//     return this.repository.updateProjectConfig(userId, projectId, updates);
//   }

//   // ============================================================================
//   // SUBSCRIPTIONS
//   // ============================================================================

//   subscribeToUserVendors(
//     userId: string,
//     onUpdate: (result: Result<VendorList | null, AppError>) => void,
//   ): () => void {
//     return this.listService.subscribeToUserList(userId, onUpdate);
//   }

//   subscribeToProjectVendors(
//     userId: string,
//     projectId: string,
//     onUpdate: (result: Result<VendorList | null, AppError>) => void,
//   ): () => void {
//     // Note: userId parameter is not used but kept for interface compatibility
//     return this.listService.subscribeToProjectList(projectId, onUpdate);
//   }

//   // ============================================================================
//   // FUTURE QR CODE SUPPORT
//   // ============================================================================

//   async addVendorFromQRCode(
//     userId: string,
//     qrData: string,
//     scope: 'user' | 'project',
//     projectId?: string,
//   ): Promise<Result<VendorItem, AppError>> {
//     // TODO: Implement QR code parsing and vendor creation
//     return err(
//       ErrorMapper.createGenericError(
//         ErrorCode.NOT_IMPLEMENTED,
//         'QR code support not yet implemented',
//         'QR code support is not yet available.',
//         ErrorContextBuilder.toString(
//           ErrorContextBuilder.fromService(this.context, 'addVendorFromQRCode', userId),
//         ),
//       ),
//     );
//   }
// }

// // Export interface for compatibility
// export interface IVendorService {
//   // User scope operations
//   getUserVendors(userId: string): Promise<Result<VendorList, AppError>>;
//   createInitialUser(userId: string): Promise<Result<void, AppError>>;
//   addUserVendor(
//     userId: string,
//     input: VendorItemInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<VendorItem, AppError>>;
//   updateUserVendor(userId: string, item: VendorItem): Promise<Result<void, AppError>>;
//   deleteUserVendor(userId: string, vendorId: string): Promise<Result<void, AppError>>;
//   updateUserConfig(userId: string, updates: Partial<VendorConfig>): Promise<Result<void, AppError>>;

//   // Project scope operations
//   getProjectVendors(userId: string, projectId: string): Promise<Result<VendorList, AppError>>;
//   createInitialProject(userId: string, projectId: string): Promise<Result<void, AppError>>;
//   addProjectVendor(
//     userId: string,
//     projectId: string,
//     input: VendorItemInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<VendorItem, AppError>>;
//   updateProjectVendor(
//     userId: string,
//     projectId: string,
//     item: VendorItem,
//   ): Promise<Result<void, AppError>>;
//   deleteProjectVendor(
//     userId: string,
//     projectId: string,
//     vendorId: string,
//   ): Promise<Result<void, AppError>>;
//   updateProjectConfig(
//     userId: string,
//     projectId: string,
//     updates: Partial<VendorConfig>,
//   ): Promise<Result<void, AppError>>;

//   // Subscriptions
//   subscribeToUserVendors(
//     userId: string,
//     onUpdate: (result: Result<VendorList | null, AppError>) => void,
//   ): () => void;
//   subscribeToProjectVendors(
//     userId: string,
//     projectId: string,
//     onUpdate: (result: Result<VendorList | null, AppError>) => void,
//   ): () => void;

//   // Future QR code support
//   addVendorFromQRCode(
//     userId: string,
//     qrData: string,
//     scope: 'user' | 'project',
//     projectId?: string,
//   ): Promise<Result<VendorItem, AppError>>;
// }
