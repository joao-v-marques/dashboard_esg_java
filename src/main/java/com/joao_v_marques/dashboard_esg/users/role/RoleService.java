package com.joao_v_marques.dashboard_esg.users.role;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.users.role.dto.RoleRequest;
import com.joao_v_marques.dashboard_esg.users.role.dto.RoleResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    // GET de todas as roles cadastradas
    @Transactional(readOnly = true)
    public List<RoleResponse> findAll() {
        return roleRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RoleResponse create(RoleRequest request) {
        // Nomes sempre em maiúsculo, pois são usados como authority (ROLE_ + nome)
        String name = request.name().trim().toUpperCase(Locale.ROOT);

        if (roleRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A role que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        Role role = new Role();
        role.setName(name);

        Role saved = roleRepository.save(role);

        return toResponse(saved);
    }

    @Transactional
    public RoleResponse update(Integer roleId, RoleRequest request) {
        // Nomes sempre em maiúsculo, pois são usados como authority (ROLE_ + nome)
        String name = request.name().trim().toUpperCase(Locale.ROOT);

        // Valida se a role editada realmente existe
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhuma função de usuário com o ID fornecido."));

        // Validações que a DTO não cobre
        // A role ADMINISTRATOR é usada na autorização (hasRole), editá-la ou desativá-la tiraria o acesso dos administradores
        if (Role.ADMINISTRATOR.equals(role.getName())) {
            throw new IllegalArgumentException("A role ADMINISTRATOR é protegida e não pode ser alterada ou desativada.");
        }

        if (!role.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma ocorrência inativa.");
        }

        if (roleRepository.existsByNameIgnoreCaseAndIdNot(name, roleId)) {
            throw new ConflictException("Já existe outra role cadastrada com este nome");
        }

        // Atualizar a entidade já existente
        role.setName(name);

        return toResponse(role);
    }

    @Transactional
    public RoleResponse deactivate(Integer roleId) {
        // Valida se a role desativada realmente existe
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhuma função de usuário com o ID fornecido."));

        // A role ADMINISTRATOR é usada na autorização (hasRole), editá-la ou desativá-la tiraria o acesso dos administradores
        if (Role.ADMINISTRATOR.equals(role.getName())) {
            throw new IllegalArgumentException("A role ADMINISTRATOR é protegida e não pode ser alterada ou desativada.");
        }

        if (!role.isActive()) {
            throw new IllegalArgumentException("Esta função já está inativa.");
        }

        role.setActive(false);

        return toResponse(role);
    }

    @Transactional
    public RoleResponse reactivate(Integer roleId) {
        // Valida se a role reativada realmente existe
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhuma função de usuário com o ID fornecido."));

        if (role.isActive()) {
            throw new IllegalArgumentException("Esta função já está ativa.");
        }

        role.setActive(true);

        return toResponse(role);
    }

    private RoleResponse toResponse(Role role) {
        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.isActive()
        );
    }
}
