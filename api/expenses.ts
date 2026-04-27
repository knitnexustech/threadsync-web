
/**
 * expenses.ts
 * API for the new standalone 'expenses' table.
 */

import { supabase } from '../supabaseClient';
import { User, Expense, hasPermission } from '../types';

/**
 * FETCH: All expenses for the company.
 */
export const getExpenses = async (currentUser: User): Promise<Expense[]> => {
    const filters = [`created_by.eq.${currentUser.id}`];
    
    if (currentUser.company_id) {
        filters.push(`company_id.eq.${currentUser.company_id}`);
    }
    
    if (currentUser.company?.name) {
        filters.push(`description.ilike."%${currentUser.company.name}%"`); // fallback
    }

    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .or(filters.join(','))
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Expense[];
};

/**
 * FETCH: Expenses linked to a specific order.
 */
export const getOrderExpenses = async (orderId: string): Promise<Expense[]> => {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Expense[];
};

/**
 * CREATE: Add a new expense.
 */
export const createExpense = async (
    currentUser: User,
    params: {
        description: string;
        amount:      number;
        order_id?:   string;
        created_at?: string;
    }
): Promise<Expense> => {
    if (!hasPermission(currentUser.role, 'CREATE_SIMPLE_EXPENSE')) {
        throw new Error('Permission denied');
    }

    const { data, error } = await supabase
        .from('expenses')
        .insert({
            company_id:  currentUser.company_id,
            order_id:    params.order_id || null,
            description: params.description,
            amount:      params.amount,
            created_by:  currentUser.id,
            created_at:  params.created_at || new Date().toISOString(),
        })
        .select('*')
        .single();

    if (error) throw new Error(error.message);
    return data as Expense;
};

/**
 * DELETE: Remove an expense.
 */
export const deleteExpense = async (currentUser: User, id: string): Promise<void> => {
    if (!hasPermission(currentUser.role, 'DELETE_SIMPLE_EXPENSE')) {
        throw new Error('Permission denied');
    }

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('company_id', currentUser.company_id); // Security: only delete from own company

    if (error) throw new Error(error.message);
};
