
import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { User } from '../types';

interface ProductTourProps {
    currentUser: User;
    run: boolean;
    onFinish: () => void;
}

export const ProductTour: React.FC<ProductTourProps> = ({ currentUser, run, onFinish }) => {
    const isAdmin = currentUser.role === 'ADMIN';
    const isVendor = currentUser.company?.type === 'VENDOR';
    const [stepIndex, setStepIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center' as const,
            title: 'Welcome to Kramiz (Beta)! 🚀',
            content: 'Let\'s take a 2-minute tour to show you how to track your orders without the stress.',
            disableBeacon: true,
            data: { action: 'OPEN_CREATE_ORDER_MODAL' }
        },
        {
            target: '#tour-create-po',
            title: 'Start a Project',
            content: 'Click this to start. Just type your Order Number and the Style Name. This creates a private workspace for this specific job.',
            placement: 'bottom' as const,
            data: { action: 'CLOSE_MODAL' }
        },
        {
            target: '#tour-po-card',
            title: 'Manage Your Order',
            content: (
                <div className="text-sm space-y-3">
                    <p className="flex items-start gap-2">
                        Every card represents your order. You can see the status and style at a glance.
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-[#008069] flex-shrink-0 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </span>
                        <span>Use the <strong>Green Pencil</strong> to fix details like style name or quantity anytime.</span>
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-gray-500 flex-shrink-0 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </span>
                        <span>Click the <strong>Arrow</strong> to see Supplier groups (Knitting, Dyeing, etc.) for this order.</span>
                    </p>
                </div>
            ),
        },
        {
            target: '#tour-group-item',
            title: 'Department Groups',
            content: (
                <div className="text-sm space-y-3">
                    <p className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold text-lg">●</span>
                        <span><strong>Overview:</strong> This Blue group is for your internal team discussions only.</span>
                    </p>
                    <p className="flex items-start gap-2">
                        <span className="text-gray-400 font-bold text-lg">●</span>
                        <span><strong>Suppliers:</strong> Click a gray group to chat with that specific factory (e.g. Knitting).</span>
                    </p>
                </div>
            ),
        },
        {
            target: '#tour-settings-btn',
            title: 'Setup & Settings',
            content: 'Manage your internal team, external suppliers, and app settings here.',
            data: { action: 'OPEN_SETTINGS' }
        },
        {
            target: '#tour-team-btn',
            title: 'Your Office Team',
            content: 'Invite your internal staff members here. We use their phone numbers to send them a private login link via WhatsApp.',
            data: { action: 'OPEN_TEAM_MODAL' }
        },
        {
            target: '#tour-role-dropdown',
            title: 'Permissions & Roles',
            content: (
                <div className="text-sm space-y-2">
                    <p><strong>Admin:</strong> Total control. Can add/remove anyone and delete data.</p>
                    <p><strong>Senior Manager/Merch:</strong> Can create new orders, add departments, and change statuses.</p>
                    <p><strong>Junior Manager/Merch:</strong> Can chat and send photos, but cannot change order details or delete groups.</p>
                </div>
            ),
            data: { action: 'CLOSE_MODAL' }
        },
        {
            target: 'body',
            title: 'The WhatsApp "Ah-ha!" Moment 📲',
            content: (
                <div className="text-left py-2">
                    <p className="mb-3">We write the invite for you. Just click and send on WhatsApp!</p>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-[11px] text-green-800 italic shadow-inner">
                        "Hello [Name], join Kramiz (Beta) to track our latest production orders. Login Details- Phone: [Number], Passcode: [4-Digits]..."
                    </div>
                </div>
            ),
            placement: 'bottom' as const,
            data: { action: 'OPEN_SETTINGS' }
        },
        {
            target: '#tour-suppliers-btn',
            title: 'External Factories',
            content: 'Add your regular suppliers once. Later, you can assign them to any department in a single click.',
            data: { action: 'SELECT_GHOST_GROUP' }
        },
        {
            target: '#tour-status-dropdown',
            title: 'The Progress Switch',
            content: 'Is the work Pending, Started, or Done? Change it here so everyone\'s phone updates instantly.',
            data: { action: 'TOGGLE_SPEC_DRAWER' }
        },
        {
            target: '#tour-specs-drawer',
            title: 'The Paperwork (Specs)',
            content: 'Important Notes(eg. GSM, Instructions etc.,) and PDFs stay here forever. No more searching through a thousand WhatsApp photos.',

        },
        {
            target: '#tour-chat-input',
            title: 'Updates & Attachments',
            content: 'Type news or click the + icon to send photos of fabric, trims, or finishes.',
            data: { action: 'OPEN_GROUP_INFO' }
        },
        {
            target: '#tour-group-participants',
            title: 'Group Controls',
            content: (
                <div className="text-sm space-y-2">
                    <p>Click this menu to manage participants, rename the group, or remove it entirely.</p>
                    <p><strong>Add Members:</strong> Click to select and add specific people from your internal team.</p>
                    <p><strong>Team Overview:</strong> View all members from both your team and the supplier's team in one place.</p>
                    <p className="text-[11px] text-gray-500 italic mt-2 border-t pt-2">Note: All Admins of a company are added to every group by default.</p>
                </div>
            ),
        },
        {
            target: 'body',
            title: 'You\'re All Set! ✅',
            content: 'Move Kramiz (Beta) to your Home Screen and turn on Notifications so you never miss a order update. Checkout the demo now!',
            placement: 'center' as const,
        }
    ].filter(step => {
        // Filter out steps based on permissions
        if (!isAdmin && step.target === '#tour-create-po') return false;
        if (!isAdmin && step.target === '#tour-edit-po') return false;
        if (!isAdmin && step.target === '#tour-team-btn') return false;
        if (!isAdmin && step.target === '#tour-suppliers-btn') return false;
        return true;
    });

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { action, index, status, type } = data;

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            onFinish();
        } else if (type === 'step:after' && action === 'next') {
            // Add 500ms delay when clicking next
            setIsPaused(true);

            // Execute actions based on current step
            const currentStep = steps[index];
            const actionToPerform = (currentStep as any).data?.action;
            if (actionToPerform === 'OPEN_SETTINGS') {
                document.getElementById('tour-settings-btn')?.click();
            } else if (actionToPerform === 'OPEN_TEAM_MODAL') {
                document.getElementById('tour-team-btn')?.click();
            } else if (actionToPerform === 'OPEN_TEAM_DROPDOWN') {
                document.getElementById('tour-role-dropdown')?.click();
            } else if (actionToPerform === 'CLOSE_MODAL') {
                document.getElementById('modal-close-btn')?.click();
            } else if (actionToPerform === 'SELECT_GHOST_GROUP') {
                document.getElementById('tour-group-item')?.click();
            } else if (actionToPerform === 'OPEN_GROUP_INFO') {
                document.getElementById('tour-group-info-btn')?.click();
            } else if (actionToPerform === 'TOGGLE_SPEC_DRAWER') {
                document.getElementById('tour-specs-drawer')?.click();
            } else if (actionToPerform === 'OPEN_CREATE_ORDER_MODAL') {
                document.getElementById('tour-create-po')?.click();
            }

            setTimeout(() => {
                setStepIndex(index + 1);
                setIsPaused(false);
            }, 350);
        } else if (type === 'step:after' && action === 'prev') {
            setStepIndex(index - 1);
        }
    };

    const JoyrideComponent = Joyride as any;

    return (
        <JoyrideComponent
            steps={steps}
            run={run && !isPaused}
            stepIndex={stepIndex}
            continuous
            showProgress
            showSkipButton
            scrollToFirstStep
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#008069',
                    zIndex: 10000,
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                buttonNext: {
                    backgroundColor: '#008069',
                    fontSize: '12px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    borderRadius: '8px',
                    padding: '10px 20px',
                },
                buttonBack: {
                    color: '#666',
                    fontSize: '12px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                },
                buttonSkip: {
                    color: '#999',
                    fontSize: '12px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                }
            }}
            locale={{
                last: 'Finish',
                skip: 'Skip Tour',
            }}
        />
    );
};
