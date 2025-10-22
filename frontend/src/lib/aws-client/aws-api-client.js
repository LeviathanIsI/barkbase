// This class will be responsible for building and executing requests
// to our API Gateway endpoints, mimicking the Supabase 'from' syntax.
export class ApiClient {
    constructor(table, config, auth) {
        this.table = table;
        this.apiUrl = config.apiUrl;
        this.auth = auth;
        
        // Internal state for query building
        this._query = {
            filters: [],
            select: '*',
            body: null,
            id: null,
        };
    }

    // --- Query Modifiers ---

    select(columns = '*') {
        this._query.select = Array.isArray(columns) ? columns.join(',') : columns;
        return this;
    }

    eq(column, value) {
        this._query.filters.push(`${column}=eq.${value}`);
        return this;
    }
    
    // ... other filters like lt, gt, etc. could be added here

    // --- Finalizers (Execute the request) ---

    async get() {
        // This is a simplified client. A real one would have more robust
        // query building. This simulates a 'select' operation.
        const url = this._buildUrl();
        return this._execute('GET', url);
    }

    async insert(data) {
        this._query.body = data;
        const url = this._buildUrl();
        return this._execute('POST', url);
    }

    async update(data) {
        this._query.body = data;
        const url = this._buildUrl();
        // An 'update' requires a filter, typically on the ID.
        if (this._query.filters.length === 0) {
            throw new Error('Update operation requires at least one filter (e.g., .eq("id", ...))');
        }
        return this._execute('PUT', url);
    }
    
    async delete() {
        // A 'delete' requires a filter.
        if (this._query.filters.length === 0) {
            throw new Error('Delete operation requires at least one filter (e.g., .eq("id", ...))');
        }
        const url = this._buildUrl();
        return this._execute('DELETE', url);
    }

    /**
     * Executes a custom action on a resource.
     * Used for non-CRUD endpoints like /bookings/{id}/checkin.
     * @param {string} action - The name of the action (e.g., 'checkin').
     * @param {object} options - Options for the action.
     * @param {string} options.id - The ID of the resource.
     * @param {object} options.body - The request body.
     */
    async customAction(action, { id, body }) {
        this._query.body = body;
        const url = `${this.apiUrl}/${this.table}/${id}/${action}`;
        // Custom actions are always POST for simplicity
        return this._execute('POST', url);
    }

    // --- Private Helper Methods ---

    _buildUrl() {
        let path = `/api/v1/${this.table}`;
        // A simple convention: if one 'eq' filter is on 'id', use it as a path param.
        const idFilter = this._query.filters.find(f => f.startsWith('id=eq.'));
        if (idFilter) {
            path += `/${idFilter.split('.')[1]}`;
        }

        const url = new URL(path, this.apiUrl);
        
        // Add other filters as query params
        this._query.filters.forEach(filter => {
            if (filter !== idFilter) {
                const [key, value] = filter.split('=eq.');
                url.searchParams.append(key, value);
            }
        });

        if (this._query.select !== '*') {
            url.searchParams.append('select', this._query.select);
        }

        return url.toString();
    }

    async _execute(method, url) {
        // Get auth tokens from Zustand store
        const { useAuthStore } = await import('@/stores/auth');
        const accessToken = useAuthStore.getState().accessToken;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            },
        };

        if (this._query.body) {
            options.body = JSON.stringify(this._query.body);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                // ignore
            }
            throw new Error(errorText || `API request failed with status ${response.status}`);
        }

        if (response.status === 204) { // No Content
            return { data: null, error: null };
        }

        const data = await response.json();
        return { data, error: null };
    }
}
