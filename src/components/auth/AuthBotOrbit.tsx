import SubjectAvatarIcon from '../common/SubjectAvatarIcon'

type AuthField = 'email' | 'password' | null

function BotFace({ cloud = false, focusField }: { cloud?: boolean; focusField: AuthField }) {
  const eyeY = cloud ? 57 : 50
  const mouthY = cloud ? 68 : 63

  return (
    <svg className="hl-auth-bot__face" viewBox="0 0 100 100" aria-hidden="true">
      {focusField === 'password' ? (
        <>
          <path d={`M35 ${eyeY + 1}q4-5 8 0`} fill="none" stroke="#17415f" strokeWidth="2.5" strokeLinecap="round" />
          <path d={`M57 ${eyeY + 1}q4-5 8 0`} fill="none" stroke="#17415f" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={focusField === 'email' ? 42 : 39} cy={eyeY} r="3.5" fill="#17415f" />
          <circle cx={focusField === 'email' ? 64 : 61} cy={eyeY} r="3.5" fill="#17415f" />
        </>
      )}
      <path
        d={`M42 ${mouthY} Q50 ${mouthY + 7} 58 ${mouthY}`}
        fill="none"
        stroke="#17415f"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  )
}

function RoundRobot({ focusField }: { focusField: AuthField }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
      <path d="M50 20V12" stroke="#248f9c" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="10" r="6" fill="#f3b942" />
      <circle cx="17" cy="51" r="8" fill="#42b9ad" />
      <circle cx="83" cy="51" r="8" fill="#42b9ad" />
      <rect x="23" y="22" width="54" height="61" rx="19" fill="#42b9ad" />
      <rect x="29" y="35" width="42" height="30" rx="12" fill="#174b68" />
      {focusField === 'password' ? (
        <path d="M37 50q4-5 8 0m10 0q4-5 8 0" fill="none" stroke="#e8f9fc" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <>
          <circle cx={focusField === 'email' ? 44 : 41} cy="49" r="3.5" fill="#e8f9fc" />
          <circle cx={focusField === 'email' ? 62 : 59} cy="49" r="3.5" fill="#e8f9fc" />
        </>
      )}
      <path d="M42 57Q50 64 58 57" fill="none" stroke="#e8f9fc" strokeWidth="3" strokeLinecap="round" />
      <rect x="42" y="71" width="16" height="4" rx="2" fill="#d6f3ee" />
    </svg>
  )
}

function ScreenRobot({ focusField }: { focusField: AuthField }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
      <path d="M50 19V12" stroke="#4676c7" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 9l-5 5h10z" fill="#f2a640" />
      <path
        d="M30 23h40l14 15v28L50 86 16 66V38z"
        fill="#6e92dc"
        stroke="#5279c5"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="29" y="37" width="42" height="31" rx="11" fill="#193f68" />
      {focusField === 'password' ? (
        <path d="M36 51q4-5 8 0m12 0q4-5 8 0" fill="none" stroke="#eaf6ff" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d={focusField === 'email' ? 'M43 50v1m20-1v1' : 'M40 50v1m20-1v1'} stroke="#eaf6ff" strokeWidth="5" strokeLinecap="round" />
      )}
      <path d="M42 59q8 6 16 0" fill="none" stroke="#eaf6ff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="76" r="2.5" fill="#d5e7ff" />
    </svg>
  )
}

function AuthBotOrbit({ focusField = null }: { focusField?: AuthField }) {
  return (
    <div className="hl-auth-bot-orbit" data-focus={focusField ?? 'idle'} aria-hidden="true">
      <span className="hl-auth-bot hl-auth-bot--star" data-auth-bot="star">
        <span className="hl-auth-bot__art"><SubjectAvatarIcon type="star" className="size-full drop-shadow-[0_10px_14px_rgba(24,89,135,.16)]" /><BotFace focusField={focusField} /></span>
      </span>
      <span className="hl-auth-bot hl-auth-bot--cloud" data-auth-bot="cloud">
        <span className="hl-auth-bot__art"><SubjectAvatarIcon type="cloud" className="size-full drop-shadow-[0_10px_14px_rgba(24,89,135,.16)]" /><BotFace cloud focusField={focusField} /></span>
      </span>
      <span className="hl-auth-bot hl-auth-bot--round-robot" data-auth-bot="round-robot">
        <span className="hl-auth-bot__art"><RoundRobot focusField={focusField} /></span>
      </span>
      <span className="hl-auth-bot hl-auth-bot--screen-robot" data-auth-bot="screen-robot">
        <span className="hl-auth-bot__art"><ScreenRobot focusField={focusField} /></span>
      </span>
    </div>
  )
}

export default AuthBotOrbit
