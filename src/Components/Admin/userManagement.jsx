
function UserManagement({
 users,
 loading,
 formatDateTime,
 handleEditUser,
 handleDeleteUser,
 setShowUserModal,
}) {


 return (
<div className="users-section">
<div className="users-table">
  <table>
    <thead>
      <tr>
        <th>Nom d'utilisateur</th>
        <th>Email</th>
        <th>Rôle</th>
        <th>Statut</th>
        <th>Dernière connexion</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {users.map((user) => (
        <tr key={user._id}>
          <td>{user.username}</td>
          <td>{user.email}</td>
          <td>
            <span className={`role ${user.role}`}>
              {user.role.toUpperCase()}
            </span>
          </td>
          <td>
            <span
              className={`status ${
                user.isActive ? "active" : "inactive"
              }`}
            >
              {user.isActive ? "Actif" : "Inactif"}
            </span>
          </td>
          <td>
            {user.lastLogin
              ? formatDateTime(user.lastLogin)
              : "Jamais"}
          </td>
          <td className="actions">
            <button
              onClick={() => handleEditUser(user)}
              className="btn-edit"
              title="Modifier"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button
              onClick={() => handleDeleteUser(user._id)}
              className="btn-delete"
              title="Supprimer"
            >
              <i className="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div className="section-footer">
  <button
    onClick={() => setShowUserModal(true)}
    className="btn-primary"
  >
    <i className="bi bi-person-plus"></i>
    Ajouter un utilisateur
  </button>
</div>
</div>
 )
}

export default UserManagement

