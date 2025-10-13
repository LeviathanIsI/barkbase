const {
  evaluatePropertyCondition,
  evaluateCriterion,
  evaluateCriteriaGroup,
  evaluateCriteriaGroups,
  shouldEnroll,
  buildContext,
  getProp,
  runCustomAction,
} = require('../services/criteriaEvaluator');

describe('Criteria Evaluator', () => {
  describe('getProp', () => {
    it('should get simple property', () => {
      const context = {
        owner: { firstName: 'John', lastName: 'Doe' },
      };
      expect(getProp(context, 'owner', 'firstName')).toBe('John');
    });

    it('should get nested property', () => {
      const context = {
        owner: { address: { city: 'New York', zip: '10001' } },
      };
      expect(getProp(context, 'owner', 'address.city')).toBe('New York');
    });

    it('should return undefined for missing property', () => {
      const context = {
        owner: { firstName: 'John' },
      };
      expect(getProp(context, 'owner', 'email')).toBeUndefined();
    });
  });

  describe('evaluatePropertyCondition', () => {
    const context = {
      owner: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        balance: 100,
        tags: ['VIP', 'Premium'],
        active: true,
      },
    };

    it('should evaluate equality operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'firstName' },
        operator: 'eq',
        value: 'John',
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate inequality operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'firstName' },
        operator: 'neq',
        value: 'Jane',
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate greater than operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'balance' },
        operator: 'gt',
        value: 50,
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate less than operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'balance' },
        operator: 'lt',
        value: 200,
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate contains operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'email' },
        operator: 'contains',
        value: 'example',
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate in operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'firstName' },
        operator: 'in',
        value: ['John', 'Jane', 'Bob'],
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate is_true operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'active' },
        operator: 'is_true',
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate is_known operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'email' },
        operator: 'is_known',
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });

    it('should evaluate is_unknown operator', () => {
      const condition = {
        object: 'owner',
        property: { key: 'middleName' },
        operator: 'is_unknown',
      };
      expect(evaluatePropertyCondition(condition, context)).toBe(true);
    });
  });

  describe('evaluateCriteriaGroup', () => {
    const context = {
      owner: {
        firstName: 'John',
        balance: 100,
        tags: ['VIP'],
      },
    };

    it('should pass when all criteria pass (AND logic)', () => {
      const group = {
        id: 'group1',
        name: 'Test Group',
        criteria: [
          {
            id: 'c1',
            type: 'property-condition',
            condition: {
              object: 'owner',
              property: { key: 'firstName' },
              operator: 'eq',
              value: 'John',
            },
          },
          {
            id: 'c2',
            type: 'property-condition',
            condition: {
              object: 'owner',
              property: { key: 'balance' },
              operator: 'gt',
              value: 50,
            },
          },
        ],
      };

      expect(evaluateCriteriaGroup(group, context)).toBe(true);
    });

    it('should fail when any criterion fails (AND logic)', () => {
      const group = {
        id: 'group1',
        name: 'Test Group',
        criteria: [
          {
            id: 'c1',
            type: 'property-condition',
            condition: {
              object: 'owner',
              property: { key: 'firstName' },
              operator: 'eq',
              value: 'John',
            },
          },
          {
            id: 'c2',
            type: 'property-condition',
            condition: {
              object: 'owner',
              property: { key: 'balance' },
              operator: 'gt',
              value: 200, // Will fail
            },
          },
        ],
      };

      expect(evaluateCriteriaGroup(group, context)).toBe(false);
    });
  });

  describe('evaluateCriteriaGroups', () => {
    const context = {
      owner: {
        firstName: 'John',
        balance: 100,
      },
    };

    it('should pass when ANY group passes (OR logic)', () => {
      const groups = [
        {
          id: 'group1',
          name: 'Group 1',
          criteria: [
            {
              id: 'c1',
              type: 'property-condition',
              condition: {
                object: 'owner',
                property: { key: 'balance' },
                operator: 'gt',
                value: 200, // Fails
              },
            },
          ],
        },
        {
          id: 'group2',
          name: 'Group 2',
          criteria: [
            {
              id: 'c2',
              type: 'property-condition',
              condition: {
                object: 'owner',
                property: { key: 'firstName' },
                operator: 'eq',
                value: 'John', // Passes
              },
            },
          ],
        },
      ];

      expect(evaluateCriteriaGroups(groups, context)).toBe(true);
    });

    it('should fail when all groups fail', () => {
      const groups = [
        {
          id: 'group1',
          name: 'Group 1',
          criteria: [
            {
              id: 'c1',
              type: 'property-condition',
              condition: {
                object: 'owner',
                property: { key: 'balance' },
                operator: 'gt',
                value: 200, // Fails
              },
            },
          ],
        },
        {
          id: 'group2',
          name: 'Group 2',
          criteria: [
            {
              id: 'c2',
              type: 'property-condition',
              condition: {
                object: 'owner',
                property: { key: 'firstName' },
                operator: 'eq',
                value: 'Jane', // Fails
              },
            },
          ],
        },
      ];

      expect(evaluateCriteriaGroups(groups, context)).toBe(false);
    });
  });

  describe('custom criteria and actions', () => {
    it('supports OR logic across groups', () => {
      const context = {
        owner: { email: 'vip@example.com' },
        payload: {},
      };

      const groups = [
        {
          id: 'g1',
          criteria: [
            {
              type: 'property-condition',
              condition: {
                object: 'owner',
                property: { key: 'email' },
                operator: 'contains',
                value: 'example.com',
              },
            },
          ],
        },
        {
          id: 'g2',
          criteria: [
            {
              type: 'custom',
              logic: { var: 'payload.alwaysFalse' },
            },
          ],
        },
      ];

      expect(evaluateCriteriaGroups(groups, context)).toBe(true);
    });

    it('evaluates custom JSON logic expressions safely', () => {
      const context = {
        owner: { balance: 150 },
      };

      const criterion = {
        type: 'custom',
        logic: {
          and: [
            { '>': [{ var: 'owner.balance' }, 100] },
            { '!': [{ var: 'payload.disabled' }] },
          ],
        },
      };

      expect(evaluateCriterion(criterion, context)).toBe(true);
    });

    it('treats attempts to access globals as false', () => {
      const context = {};

      const criterion = {
        type: 'custom',
        logic: { var: 'global.process' },
      };

      expect(evaluateCriterion(criterion, context)).toBe(false);
    });

    it('runs custom actions and applies context mutations', async () => {
      const context = {
        owner: { firstName: 'Jane' },
      };

      const setContext = jest.fn();
      const result = await runCustomAction({
        context,
        config: {
          js: JSON.stringify({ cat: ['Hello ', { var: 'owner.firstName' }] }),
          setContext: { greetingSent: true },
        },
        log: jest.fn(),
        setContext,
      });

      expect(result).toEqual({
        result: {
          executed: true,
          output: 'Hello Jane',
        },
      });
      expect(setContext).toHaveBeenCalledWith({ greetingSent: true });
    });
  });

  describe('shouldEnroll', () => {
    it('should enroll when criteria and enrollment filters pass', () => {
      const trigger = {
        criteriaGroups: [
          {
            id: 'g1',
            name: 'Main Criteria',
            criteria: [
              {
                id: 'c1',
                type: 'property-condition',
                condition: {
                  object: 'owner',
                  property: { key: 'balance' },
                  operator: 'gt',
                  value: 0,
                },
              },
            ],
          },
        ],
        enrollmentFilters: [
          {
            id: 'f1',
            name: 'Filter',
            criteria: [
              {
                id: 'c2',
                type: 'property-condition',
                condition: {
                  object: 'owner',
                  property: { key: 'active' },
                  operator: 'is_true',
                },
              },
            ],
          },
        ],
      };

      const context = {
        owner: { balance: 100, active: true },
      };

      expect(shouldEnroll(trigger, context)).toBe(true);
    });

    it('should not enroll when criteria fails', () => {
      const trigger = {
        criteriaGroups: [
          {
            id: 'g1',
            name: 'Main Criteria',
            criteria: [
              {
                id: 'c1',
                type: 'property-condition',
                condition: {
                  object: 'owner',
                  property: { key: 'balance' },
                  operator: 'gt',
                  value: 200, // Fails
                },
              },
            ],
          },
        ],
        enrollmentFilters: [],
      };

      const context = {
        owner: { balance: 100 },
      };

      expect(shouldEnroll(trigger, context)).toBe(false);
    });
  });

  describe('buildContext', () => {
    it('should build context with flattened objects', () => {
      const payload = {
        owner: { id: '123', firstName: 'John' },
        pet: { id: '456', name: 'Rex' },
      };

      const context = buildContext(payload, { triggerType: 'manual' });

      expect(context.triggerType).toBe('manual');
      expect(context.payload).toEqual(payload);
      expect(context.owner).toEqual(payload.owner);
      expect(context.pet).toEqual(payload.pet);
      expect(context.now).toBeDefined();
      expect(context.actions).toEqual([]);
    });
  });
});
