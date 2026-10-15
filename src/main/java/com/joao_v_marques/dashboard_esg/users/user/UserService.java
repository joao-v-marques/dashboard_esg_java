package com.joao_v_marques.dashboard_esg.users.user;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.users.auth.dto.ChangePasswordRequest;
import com.joao_v_marques.dashboard_esg.users.role.Role;
import com.joao_v_marques.dashboard_esg.users.role.RoleRepository;
import com.joao_v_marques.dashboard_esg.users.sector.Sector;
import com.joao_v_marques.dashboard_esg.users.sector.SectorRepository;
import com.joao_v_marques.dashboard_esg.users.user.dto.ResetPasswordRequest;
import com.joao_v_marques.dashboard_esg.users.user.dto.UserRequest;
import com.joao_v_marques.dashboard_esg.users.user.dto.UserResponse;
import com.joao_v_marques.dashboard_esg.users.user.dto.UserUpdateRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SectorRepository sectorRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, SectorRepository sectorRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.sectorRepository = sectorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // GET de todos os usuários
    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse create(UserRequest request) {
        String name = StringUtils.hasText(request.name()) ? request.name().trim() : null;
        String username = request.username().trim();
        String email = StringUtils.hasText(request.email()) ? request.email().trim() : null;

        // Validando as FK's
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new IllegalArgumentException("A função informada não existe."));
        if (!role.isActive()) {
            throw new IllegalArgumentException("Não é possível cadastrar um usuário com a função inativa.");
        }
        Sector sector = sectorRepository.findById(request.sectorId())
                .orElseThrow(() -> new IllegalArgumentException("O setor informado não existe."));
        if (!sector.isActive()) {
            throw new IllegalArgumentException("Não é possível cadastrar um usuário com o setor inativo.");
        }

        // Verifica se o usuário já existe antes de criar (nunca pode ter 2 iguais)
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ConflictException("O usuário que está tentando cadastrar já existe.");
        }

        // Criar a entidade com base na request
        User user = new User();
        user.setName(name);
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(role);
        user.setSector(sector);

        User created = userRepository.save(user);

        return toResponse(created);
    }

    // PUT de um usuário já existente (não altera a senha)
    @Transactional
    public UserResponse update(Integer userId, UserUpdateRequest request) {
        String name = StringUtils.hasText(request.name()) ? request.name().trim() : null;
        String username = request.username().trim();
        String email = StringUtils.hasText(request.email()) ? request.email().trim() : null;

        // Valida se o usuário editado realmente existe
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum usuário com o ID fornecido."));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Não é possível editar um usuário inativo.");
        }

        // Validando as FK's
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new IllegalArgumentException("A função informada não existe."));
        if (!role.isActive()) {
            throw new IllegalArgumentException("Não é possível atribuir uma função inativa ao usuário.");
        }
        Sector sector = sectorRepository.findById(request.sectorId())
                .orElseThrow(() -> new IllegalArgumentException("O setor informado não existe."));
        if (!sector.isActive()) {
            throw new IllegalArgumentException("Não é possível atribuir um setor inativo ao usuário.");
        }

        // Verifica se o username já pertence a outro usuário
        if (userRepository.existsByUsernameIgnoreCaseAndIdNot(username, userId)) {
            throw new ConflictException("Já existe outro usuário com esse username.");
        }

        // Atualizar a entidade já existente
        user.setName(name);
        user.setUsername(username);
        user.setEmail(email);
        user.setRole(role);
        user.setSector(sector);

        return toResponse(user);
    }

    // PATCH da senha do próprio usuário logado (exige a senha atual)
    @Transactional
    public void changeOwnPassword(Integer userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum usuário com o ID fornecido."));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("A senha atual está incorreta.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("A nova senha deve ser diferente da senha atual.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    // PATCH da senha de um usuário pelo administrador (não exige a senha atual)
    @Transactional
    public void resetPassword(Integer userId, ResetPasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum usuário com o ID fornecido."));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Não é possível alterar a senha de um usuário inativo.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    // PATCH para desativar um usuário (soft delete)
    @Transactional
    public UserResponse deactivate(Integer userId, Integer currentUserId) {
        // Valida se o usuário desativado realmente existe
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum usuário com o ID fornecido."));

        // Impede que o administrador tranque o próprio acesso
        if (userId.equals(currentUserId)) {
            throw new IllegalArgumentException("Não é possível desativar o próprio usuário.");
        }
        if (!user.isActive()) {
            throw new IllegalArgumentException("Este usuário já está inativo.");
        }

        user.setActive(false);

        return toResponse(user);
    }

    // PATCH para reativar um usuário
    @Transactional
    public UserResponse reactivate(Integer userId) {
        // Valida se o usuário reativado realmente existe
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum usuário com o ID fornecido."));

        if (user.isActive()) {
            throw new IllegalArgumentException("Este usuário já está ativo.");
        }

        user.setActive(true);

        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().getId(),
                user.getRole().getName(),
                user.getSector().getId(),
                user.getSector().getName(),
                user.getCreatedAt(),
                user.isActive()
        );
    }
}
