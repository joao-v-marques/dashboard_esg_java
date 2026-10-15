package com.joao_v_marques.dashboard_esg.users.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    // Usado no login (CustomUserDetailsService), já traz a role para montar a authority e o setor para o GET /api/auth/me
    @Query("SELECT u FROM User u JOIN FETCH u.role JOIN FETCH u.sector WHERE u.username = :username")
    Optional<User> findByUsername(@Param("username") String username);

    boolean existsByUsernameIgnoreCase(String username);

    // Usado no PUT, para validar duplicidade ignorando o próprio usuário editado
    boolean existsByUsernameIgnoreCaseAndIdNot(String username, Integer id);
}
